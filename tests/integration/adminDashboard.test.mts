import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { tokyoPeriodStarts } from "../../lib/tokyoTime"
import { OrderRepository } from "../../repositories/implementations/orderRepository"
import { CANCELLED_SHIPPING_STATUS, INITIAL_PAYMENT_STATUS, INITIAL_SHIPPING_STATUS, PAID_PAYMENT_STATUS, PAYMENT_ERROR_STATUS, REFUNDED_PAYMENT_STATUS, REFUND_ERROR_PAYMENT_STATUS } from "../../services/checkout/orderStatus"

// Totals are global and other files create orders in parallel, so these tests only look at
// orders dated in 2099–2101 or carrying a payment status unique to this run.
const RUN = Date.now()
const UNIQUE_PAYMENT_STATUS = `test-${RUN}`
const FUTURE = new Date("2099-01-01T00:00:00Z")
const repo = new OrderRepository()
let userId = 0

async function createOrder(data: { totalPrice: number, orderedAt: Date, shippingStatus?: string, paymentStatus?: string }) {
  return prisma.order.create({
    data: {
      userId,
      shippingPrice: 1000,
      paymentStatus: data.paymentStatus ?? INITIAL_PAYMENT_STATUS,
      shippingStatus: data.shippingStatus ?? INITIAL_SHIPPING_STATUS,
      totalPrice: data.totalPrice,
      orderedAt: data.orderedAt,
    },
  })
}

before(async () => {
  userId = (await prisma.user.create({
    data: { email: `dashboard-${RUN}@example.test`, passwordHash: "-", firstName: "Dash", lastName: "Board" },
  })).id
})

after(async () => {
  await prisma.order.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
})

test("summarizeSales はキャンセル以外の注文の件数と totalPrice を合計する", async () => {
  await createOrder({ totalPrice: 1500, orderedAt: new Date("2099-01-02T00:00:00Z") })
  await createOrder({ totalPrice: 2500, orderedAt: new Date("2099-01-03T00:00:00Z") })
  await createOrder({ totalPrice: 9000, orderedAt: new Date("2099-01-04T00:00:00Z"), shippingStatus: CANCELLED_SHIPPING_STATUS })

  assert.deepEqual(await repo.summarizeSales(FUTURE), { orderCount: 2, totalPrice: 4000, paidOrderCount: 0, paidTotalPrice: 0 })
  assert.deepEqual(await repo.summarizeSales(new Date("2099-01-05T00:00:00Z")), { orderCount: 0, totalPrice: 0, paidOrderCount: 0, paidTotalPrice: 0 })
})

test("findManyForAdmin は支払いステータスと件数で絞れる（新しい順）", async () => {
  const created = []
  for (let day = 1; day <= 6; day++) {
    created.push(await createOrder({ totalPrice: 1000 + day, orderedAt: new Date(Date.UTC(2098, 0, day)), paymentStatus: UNIQUE_PAYMENT_STATUS }))
  }

  const orders = await repo.findManyForAdmin({ shippingStatus: null, paymentStatus: UNIQUE_PAYMENT_STATUS, limit: 5 })
  assert.deepEqual(orders.map(order => order.id), created.slice(1).reverse().map(order => order.id))
  assert.equal(orders[0].customerName, "Board Dash")
  assert.equal(await repo.countByPaymentStatus(UNIQUE_PAYMENT_STATUS), 6)
})

test("決済状態ごとの注文総額と決済済み売上・キャンセル除外", async () => {
  // A separate later cohort keeps the existing 2099 cancellation regression intact.
  const since = new Date("2100-01-01T00:00:00Z")
  const statuses = [INITIAL_PAYMENT_STATUS, PAYMENT_ERROR_STATUS, PAID_PAYMENT_STATUS, REFUNDED_PAYMENT_STATUS, REFUND_ERROR_PAYMENT_STATUS, "未知の状態"]
  let totalPrice = 0
  for (const [index, paymentStatus] of statuses.entries()) {
    const amount = (index + 1) * 1000
    await createOrder({ totalPrice: amount, orderedAt: since, paymentStatus })
    totalPrice += amount
    assert.deepEqual(await repo.summarizeSales(since), {
      orderCount: index + 1, totalPrice,
      paidOrderCount: index >= 2 ? 1 : 0, paidTotalPrice: index >= 2 ? 3000 : 0,
    }, paymentStatus)
    // Even a paid order or a failed refund must not leak through cancellation exclusion.
    await createOrder({ totalPrice: 99000, orderedAt: since, paymentStatus, shippingStatus: CANCELLED_SHIPPING_STATUS })
    assert.equal((await repo.summarizeSales(since)).totalPrice, totalPrice)
    assert.equal((await repo.summarizeSales(since)).paidTotalPrice, index >= 2 ? 3000 : 0)
  }
})

test("日本時間の日次・月次境界で決済済み売上を集計し、返金・キャンセルで注文日の値が変わる", async () => {
  const { dayStart, monthStart } = tokyoPeriodStarts(new Date("2101-02-10T00:00:00Z"))
  await createOrder({ totalPrice: 9000, orderedAt: new Date(monthStart.getTime() - 1), paymentStatus: PAID_PAYMENT_STATUS })
  await createOrder({ totalPrice: 1000, orderedAt: monthStart, paymentStatus: PAID_PAYMENT_STATUS })
  await createOrder({ totalPrice: 2000, orderedAt: new Date(dayStart.getTime() - 1), paymentStatus: PAID_PAYMENT_STATUS })
  const paid = await createOrder({ totalPrice: 3000, orderedAt: dayStart, paymentStatus: PAID_PAYMENT_STATUS })
  await createOrder({ totalPrice: 4000, orderedAt: dayStart })
  const cancelled = await createOrder({ totalPrice: 5000, orderedAt: dayStart, paymentStatus: PAID_PAYMENT_STATUS, shippingStatus: CANCELLED_SHIPPING_STATUS })
  assert.deepEqual(await repo.summarizeSales(dayStart), { orderCount: 2, totalPrice: 7000, paidOrderCount: 1, paidTotalPrice: 3000 })
  assert.deepEqual(await repo.summarizeSales(monthStart), { orderCount: 4, totalPrice: 10000, paidOrderCount: 3, paidTotalPrice: 6000 })
  await prisma.order.update({ where: { id: paid.id }, data: { paymentStatus: REFUNDED_PAYMENT_STATUS } })
  assert.deepEqual(await repo.summarizeSales(dayStart), { orderCount: 2, totalPrice: 7000, paidOrderCount: 0, paidTotalPrice: 0 })
  // Normal cancellation excludes the order from both figures, regardless of refund outcome.
  await prisma.order.update({ where: { id: paid.id }, data: { shippingStatus: CANCELLED_SHIPPING_STATUS } })
  for (const paymentStatus of [PAID_PAYMENT_STATUS, REFUND_ERROR_PAYMENT_STATUS, REFUNDED_PAYMENT_STATUS]) {
    await prisma.order.update({ where: { id: cancelled.id }, data: { paymentStatus } })
    assert.deepEqual(await repo.summarizeSales(dayStart), { orderCount: 1, totalPrice: 4000, paidOrderCount: 0, paidTotalPrice: 0 })
  }
})
