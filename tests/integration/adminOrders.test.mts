import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { OrderRepository } from "../../repositories/implementations/orderRepository"
import { cancelOrder, retryRefund, updateShippingStatus } from "../../services/admin/orderAdminService"
import { INITIAL_PAYMENT_STATUS } from "../../services/checkout/orderStatus"
import { FakeGateway } from "./fakeGateway.mjs"

// A dedicated user keeps this file independent of the seeded users that other integration files reset in parallel.
const userEmail = `admin-orders-${Date.now()}@example.test`
let userId = 0
// Variant 8 is reserved for this file; its stock is restored after each test because cancelling changes it.
const VARIANT_ID = 8
let originalStock = 0

before(async () => {
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash: "unused",
      firstName: "Hana",
      lastName: "Test",
      postalCode: "1000001",
      prefecture: "東京都",
      addressLine1: "千代田区千代田 1-1",
    },
  })
  userId = user.id
})

beforeEach(async () => {
  originalStock = await stockOf(VARIANT_ID)
})

afterEach(async () => {
  await prisma.variant.update({ where: { id: VARIANT_ID }, data: { stock: originalStock } })
})

after(async () => {
  await prisma.orderItem.deleteMany({ where: { order: { userId } } })
  await prisma.order.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
})

type OrderInput = {
  userId: number
  shippingStatus: string
  paymentStatus?: string
  paymentIntentId?: string
  orderedAt?: Date
  items?: { variantId: number, quantity: number }[]
}

// Creates only the order and its lines; stock is left untouched.
async function createOrder(input: OrderInput) {
  const items = input.items ?? [{ variantId: 8, quantity: 1 }]
  const variants = await prisma.variant.findMany({ where: { id: { in: items.map(item => item.variantId) } } })
  const subtotal = items.reduce((sum, item) => sum + (variants.find(variant => variant.id === item.variantId)?.price ?? 0) * item.quantity, 0)
  return prisma.order.create({
    data: {
      userId: input.userId,
      paymentStatus: input.paymentStatus ?? INITIAL_PAYMENT_STATUS,
      shippingStatus: input.shippingStatus,
      shippingPrice: 1000,
      totalPrice: subtotal + 1000,
      paymentIntentId: input.paymentIntentId,
      orderedAt: input.orderedAt,
      orderItems: {
        create: items.map(item => {
          const variant = variants.find(candidate => candidate.id === item.variantId)!
          return { variantId: item.variantId, variantName: variant.name, priceAtPurchase: variant.price, quantity: item.quantity }
        }),
      },
    },
  })
}

async function findOrder(orderId: number) {
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } })
}

async function statusesOf(orderId: number) {
  const { shippingStatus, paymentStatus } = await findOrder(orderId)
  return { shippingStatus, paymentStatus }
}

async function stockOf(variantId: number) {
  return (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock
}

test("管理者用の一覧は全ユーザーの注文を新しい順に注文者名つきで返し、発送状態で絞り込める", async () => {
  const older = await createOrder({ userId, shippingStatus: "未発送", orderedAt: new Date("2026-01-01") })
  const newer = await createOrder({ userId, shippingStatus: "発送準備中", orderedAt: new Date("2026-01-02") })
  const all = await new OrderRepository().findManyForAdmin({ shippingStatus: null })
  const ids = all.map(order => order.id)
  assert.ok(ids.indexOf(newer.id) < ids.indexOf(older.id))
  assert.equal(all.find(order => order.id === newer.id)?.customerName, "Test Hana")

  const preparing = await new OrderRepository().findManyForAdmin({ shippingStatus: "発送準備中" })
  assert.ok(preparing.every(order => order.shippingStatus === "発送準備中"))
  assert.ok(preparing.some(order => order.id === newer.id))
})

test("管理者用の詳細は所有者を問わず返し、お届け先がなければ null にする", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送" })
  const detail = await new OrderRepository().findByIdForAdmin(order.id)
  assert.equal(detail?.customerEmail, userEmail)
  assert.equal(detail?.hasPayment, false)
  assert.equal(detail?.shippingAddress?.prefecture, "東京都")

  await prisma.user.update({ where: { id: userId }, data: { postalCode: null } })
  assert.equal((await new OrderRepository().findByIdForAdmin(order.id))?.shippingAddress, null)
  assert.equal(await new OrderRepository().findByIdForAdmin(999_999), null)
})

test("発送ステータスを変更できる", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送" })
  await updateShippingStatus(order.id, "未発送", "発送準備中")
  await updateShippingStatus(order.id, "発送準備中", "発送済み")
  await updateShippingStatus(order.id, "発送済み", "発送準備中")
  assert.equal((await findOrder(order.id)).shippingStatus, "発送準備中")
})

test("許可されない変更・食い違い・存在しない注文はエラーにし、DB を変えない", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送" })
  await assert.rejects(updateShippingStatus(order.id, "未発送", "キャンセル"), { code: "INVALID_TRANSITION" })
  await assert.rejects(updateShippingStatus(order.id, "発送準備中", "発送済み"), { code: "STALE_STATUS" })
  await assert.rejects(updateShippingStatus(999_999, "未発送", "発送済み"), { code: "ORDER_NOT_FOUND" })
  assert.equal((await findOrder(order.id)).shippingStatus, "未発送")
})

test("決済ありの注文をキャンセルすると、全明細の在庫が戻り、冪等キー付きで 1 回返金される", async () => {
  const order = await createOrder({ userId, shippingStatus: "発送準備中", paymentStatus: "支払い済み", paymentIntentId: "pi_cancel_1",
    items: [{ variantId: 8, quantity: 2 }, { variantId: 8, quantity: 3 }] })
  const before = await stockOf(8)
  const gateway = new FakeGateway()
  assert.deepEqual(await cancelOrder(() => gateway, order.id), { refund: "refunded" })
  assert.equal(await stockOf(8), before + 5)
  assert.deepEqual(await statusesOf(order.id), { shippingStatus: "キャンセル", paymentStatus: "返金済み" })
  assert.deepEqual(gateway.refunds, [{ paymentIntentId: "pi_cancel_1", idempotencyKey: `order-${order.id}-refund` }])
})

test("決済なしの注文はゲートウェイを呼ばず、支払い状態を変えない", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送", paymentStatus: "支払い待ち", items: [{ variantId: 8, quantity: 1 }] })
  const result = await cancelOrder(() => { throw new Error("gateway must not be created") }, order.id)
  assert.deepEqual(result, { refund: "none" })
  assert.deepEqual(await statusesOf(order.id), { shippingStatus: "キャンセル", paymentStatus: "支払い待ち" })
})

test("返金に失敗してもキャンセルは確定し、返金エラーから再試行できる", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送", paymentStatus: "支払い済み", paymentIntentId: "pi_cancel_2", items: [{ variantId: 8, quantity: 1 }] })
  const before = await stockOf(8)
  const gateway = new FakeGateway()
  gateway.refundFails = true
  assert.deepEqual(await cancelOrder(() => gateway, order.id), { refund: "failed" })
  assert.equal(await stockOf(8), before + 1)
  assert.deepEqual(await statusesOf(order.id), { shippingStatus: "キャンセル", paymentStatus: "返金エラー" })

  gateway.refundFails = false
  assert.deepEqual(await retryRefund(() => gateway, order.id), { refund: "refunded" })
  assert.equal((await statusesOf(order.id)).paymentStatus, "返金済み")
  assert.equal(gateway.refunds.at(-1)?.idempotencyKey, `order-${order.id}-refund`)
  await assert.rejects(retryRefund(() => gateway, order.id), { code: "REFUND_NOT_RETRYABLE" })
})

test("発送済み・キャンセル済み・存在しない注文はキャンセルできず、何も変えない", async () => {
  const before = await stockOf(8)
  for (const shippingStatus of ["発送済み", "キャンセル"]) {
    const order = await createOrder({ userId, shippingStatus, items: [{ variantId: 8, quantity: 1 }] })
    await assert.rejects(cancelOrder(() => new FakeGateway(), order.id), { code: "NOT_CANCELLABLE" })
    assert.equal((await statusesOf(order.id)).shippingStatus, shippingStatus)
  }
  await assert.rejects(cancelOrder(() => new FakeGateway(), 999_999), { code: "ORDER_NOT_FOUND" })
  assert.equal(await stockOf(8), before)
})

test("同じ注文への同時キャンセルは 1 回だけ成功し、在庫は 1 回分だけ戻る", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送", items: [{ variantId: 8, quantity: 4 }] })
  const before = await stockOf(8)
  const results = await Promise.allSettled([1, 2, 3].map(() => cancelOrder(() => new FakeGateway(), order.id)))
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1)
  assert.equal(await stockOf(8), before + 4)
})
