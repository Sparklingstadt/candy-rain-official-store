import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { OrderRepository } from "../../repositories/implementations/orderRepository"
import { INITIAL_PAYMENT_STATUS } from "../../services/checkout/orderStatus"

// A dedicated user keeps this file independent of the seeded users that other integration files reset in parallel.
const userEmail = `admin-orders-${Date.now()}@example.test`
let userId = 0

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
