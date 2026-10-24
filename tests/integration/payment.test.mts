import assert from "node:assert/strict"
import { after, before, beforeEach, test } from "node:test"
import { prisma } from "../../lib/prisma"
import type { SavedCard } from "../../lib/cards"
import { CheckoutError, completePaidCheckout, startPaidCheckout } from "../../services/checkout/checkoutService"
import { PAID_PAYMENT_STATUS, PAYMENT_ERROR_STATUS } from "../../services/checkout/orderStatus"
import type { PaymentAuthorization, PaymentGateway } from "../../services/payment/paymentGateway"

// Variant 9 is reserved for these tests so they can change its stock without
// racing the checkout tests, which use variant 0.
const VARIANT_ID = 9
// Unique per run because stripeCustomerId is a unique column.
const CUSTOMER_ID = `cus_integration_${Date.now()}`
const CARD: SavedCard = { id: "pm_visa", brand: "visa", last4: "4242", expMonth: 12, expYear: 2034 }

class FakeGateway implements PaymentGateway {
  authorizeStatus: PaymentAuthorization["status"] = "authorized"
  captureFails = false
  readonly payments = new Map<string, PaymentAuthorization>()
  readonly calls: string[] = []

  async createCustomer() { return CUSTOMER_ID }
  async createCardSetup() { return { clientSecret: "seti_secret" } }
  async listCards() { return [CARD] }
  async findCard(customerId: string, paymentMethodId: string) {
    return customerId === CUSTOMER_ID && paymentMethodId === CARD.id ? CARD : null
  }
  async removeCard() { return true }
  async authorize({ customerId, paymentMethodId, amount }: { customerId: string, paymentMethodId: string, amount: number }) {
    this.calls.push("authorize")
    const payment: PaymentAuthorization = {
      id: `pi_${this.payments.size + 1}`,
      status: this.authorizeStatus,
      amount,
      customerId,
      paymentMethodId,
      clientSecret: "pi_secret",
    }
    this.payments.set(payment.id, payment)
    return payment
  }
  async retrieve(paymentIntentId: string) {
    const payment = this.payments.get(paymentIntentId)
    if (!payment) throw new Error("No such payment")
    return payment
  }
  async capture(paymentIntentId: string) {
    this.calls.push(`capture:${paymentIntentId}`)
    if (this.captureFails) throw new Error("capture failed")
  }
  async cancel(paymentIntentId: string) {
    this.calls.push(`cancel:${paymentIntentId}`)
  }
}

let userId: number
let cartId: number
let gateway: FakeGateway

before(async () => {
  const user = await prisma.user.create({
    data: { email: `payment-${Date.now()}@example.test`, passwordHash: "-", firstName: "Pay", lastName: "Ment", stripeCustomerId: CUSTOMER_ID },
  })
  userId = user.id
  cartId = (await prisma.cart.create({ data: { userId } })).id
})

beforeEach(async () => {
  gateway = new FakeGateway()
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { order: { userId } } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.cartItem.deleteMany({ where: { cartId } }),
    prisma.variant.update({ where: { id: VARIANT_ID }, data: { stock: 50 } }),
  ])
  await prisma.cartItem.create({ data: { cartId, variantId: VARIANT_ID, quantity: 2 } })
})

after(async () => {
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { order: { userId } } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.cartItem.deleteMany({ where: { cartId } }),
    prisma.cart.delete({ where: { id: cartId } }),
    prisma.user.delete({ where: { id: userId } }),
    prisma.variant.update({ where: { id: VARIANT_ID }, data: { stock: 50 } }),
  ])
  await prisma.$disconnect()
})

const orderCount = () => prisma.order.count({ where: { userId } })
const stock = async () => (await prisma.variant.findUniqueOrThrow({ where: { id: VARIANT_ID } })).stock

test("与信が通ると注文を保存してから売上を確定する", async () => {
  const result = await startPaidCheckout(gateway, userId, CARD.id)

  assert.ok(result.status === "completed")
  const order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId } })
  assert.equal(order.paymentIntentId, "pi_1")
  assert.equal(order.paymentMethodLabel, "Visa •••• 4242")
  assert.equal(order.paymentStatus, PAID_PAYMENT_STATUS)
  assert.equal(order.totalPrice, 6500 * 2 + 1000)
  assert.equal(gateway.payments.get("pi_1")?.amount, order.totalPrice)
  assert.deepEqual(gateway.calls, ["authorize", "capture:pi_1"])
  assert.equal(await prisma.cartItem.count({ where: { cartId } }), 0)
  assert.equal(await stock(), 48)
})

test("3Dセキュアが必要な場合は認証後に注文を確定し、再実行しても注文を重複させない", async () => {
  gateway.authorizeStatus = "requires_action"
  const result = await startPaidCheckout(gateway, userId, CARD.id)
  assert.deepEqual(result, { status: "requires_action", paymentIntentId: "pi_1", clientSecret: "pi_secret" })
  assert.equal(await orderCount(), 0)

  // The browser finished authentication; Stripe now holds the amount.
  gateway.payments.get("pi_1")!.status = "authorized"
  const orderId = await completePaidCheckout(gateway, userId, "pi_1")
  assert.equal(await completePaidCheckout(gateway, userId, "pi_1"), orderId)
  assert.equal(await orderCount(), 1)
  assert.deepEqual(gateway.calls, ["authorize", "capture:pi_1"])
})

test("認証が完了していない支払いでは注文を作成しない", async () => {
  gateway.authorizeStatus = "requires_action"
  await startPaidCheckout(gateway, userId, CARD.id)

  await assert.rejects(() => completePaidCheckout(gateway, userId, "pi_1"), (error: unknown) =>
    error instanceof CheckoutError && error.code === "PAYMENT_DECLINED")
  assert.equal(await orderCount(), 0)
})

test("カードが拒否された場合は注文・在庫・カートを変更しない", async () => {
  gateway.authorizeStatus = "failed"
  await assert.rejects(() => startPaidCheckout(gateway, userId, CARD.id), (error: unknown) =>
    error instanceof CheckoutError && error.code === "PAYMENT_DECLINED")

  assert.equal(await orderCount(), 0)
  assert.equal(await stock(), 50)
  assert.equal(await prisma.cartItem.count({ where: { cartId } }), 1)
})

test("与信後に在庫が不足した場合は与信を取り消して請求しない", async () => {
  await prisma.variant.update({ where: { id: VARIANT_ID }, data: { stock: 1 } })

  await assert.rejects(() => startPaidCheckout(gateway, userId, CARD.id), (error: unknown) =>
    error instanceof CheckoutError && error.code === "INSUFFICIENT_STOCK")
  assert.deepEqual(gateway.calls, ["authorize", "cancel:pi_1"])
  assert.equal(await orderCount(), 0)
  assert.equal(await stock(), 1)
})

test("認証中にカートが変わった場合は与信を取り消す", async () => {
  gateway.authorizeStatus = "requires_action"
  await startPaidCheckout(gateway, userId, CARD.id)
  await prisma.cartItem.updateMany({ where: { cartId }, data: { quantity: 3 } })
  gateway.payments.get("pi_1")!.status = "authorized"

  await assert.rejects(() => completePaidCheckout(gateway, userId, "pi_1"), (error: unknown) =>
    error instanceof CheckoutError && error.code === "CART_CHANGED")
  assert.deepEqual(gateway.calls, ["authorize", "cancel:pi_1"])
  assert.equal(await orderCount(), 0)
})

test("自分のカードでなければ与信しない", async () => {
  await assert.rejects(() => startPaidCheckout(gateway, userId, "pm_someone_else"), (error: unknown) =>
    error instanceof CheckoutError && error.code === "PAYMENT_METHOD_NOT_FOUND")
  assert.deepEqual(gateway.calls, [])
})

test("他の顧客の支払いIDでは注文を確定できない", async () => {
  gateway.payments.set("pi_other", {
    id: "pi_other", status: "authorized", amount: 14000, customerId: "cus_other", paymentMethodId: "pm_other", clientSecret: null,
  })
  await assert.rejects(() => completePaidCheckout(gateway, userId, "pi_other"), /Payment not found/)
  assert.equal(await orderCount(), 0)
})

test("売上の確定に失敗した注文は決済エラーとして残す", async () => {
  gateway.captureFails = true
  const result = await startPaidCheckout(gateway, userId, CARD.id)

  assert.ok(result.status === "completed")
  const order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId } })
  assert.equal(order.paymentStatus, PAYMENT_ERROR_STATUS)
})
