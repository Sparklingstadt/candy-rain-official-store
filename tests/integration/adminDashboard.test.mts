import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { OrderRepository } from "../../repositories/implementations/orderRepository"
import { CANCELLED_SHIPPING_STATUS, INITIAL_PAYMENT_STATUS, INITIAL_SHIPPING_STATUS } from "../../services/checkout/orderStatus"

// Totals are global and other files create orders in parallel, so these tests only look at
// orders dated in 2099 or carrying a payment status unique to this run.
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

  assert.deepEqual(await repo.summarizeSales(FUTURE), { orderCount: 2, totalPrice: 4000 })
  assert.deepEqual(await repo.summarizeSales(new Date("2099-01-05T00:00:00Z")), { orderCount: 0, totalPrice: 0 })
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
