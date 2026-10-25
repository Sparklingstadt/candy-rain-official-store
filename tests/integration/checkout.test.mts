import assert from "node:assert/strict"
import { after, beforeEach, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { CheckoutError, createOrderFromCart } from "../../services/checkout/checkoutService"
import { addItemToCart, CartError, removeItemFromCart, updateCartItemQuantity } from "../../services/cartService"
import { OrderRepository } from "../../repositories/implementations/orderRepository"
import { INITIAL_PAYMENT_STATUS, INITIAL_SHIPPING_STATUS } from "../../services/checkout/orderStatus"

async function resetPurchaseData() {
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { order: { userId: { in: [0, 1] } } } }),
    prisma.order.deleteMany({ where: { userId: { in: [0, 1] } } }),
    prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [0, 1] } } } }),
    prisma.variant.update({ where: { id: 0 }, data: { stock: 50 } }),
  ])
}

beforeEach(resetPurchaseData)
after(async () => {
  await resetPurchaseData()
  await prisma.$disconnect()
})

test("購入処理は注文スナップショットを保存してカートを空にする", async () => {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: 0 } })
  await prisma.cartItem.create({
    data: { cartId: cart.id, variantId: 0, quantity: 2 },
  })

  const order = await createOrderFromCart(0)
  const storedOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { orderItems: true },
  })

  assert.equal(storedOrder.shippingPrice, 1000)
  assert.equal(storedOrder.totalPrice, 2000)
  assert.equal(storedOrder.paymentStatus, INITIAL_PAYMENT_STATUS)
  assert.equal(storedOrder.shippingStatus, INITIAL_SHIPPING_STATUS)
  assert.equal(storedOrder.orderItems.length, 1)
  assert.equal(storedOrder.orderItems[0].variantName, "ランダム缶バッジ")
  assert.equal(storedOrder.orderItems[0].priceAtPurchase, 500)
  assert.equal(storedOrder.orderItems[0].quantity, 2)
  assert.equal(await prisma.cartItem.count({ where: { cartId: cart.id } }), 0)
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: 0 } })).stock, 48)
})

test("空のカートでは注文を作成しない", async () => {
  await assert.rejects(() => createOrderFromCart(0), /カートが空です/)
  assert.equal(await prisma.order.count({ where: { userId: 0 } }), 0)
})

test("他ユーザーのカート商品は更新も削除もできない", async () => {
  const otherCart = await prisma.cart.findUniqueOrThrow({ where: { userId: 1 } })
  const otherCartItem = await prisma.cartItem.create({
    data: { cartId: otherCart.id, variantId: 0, quantity: 2 },
  })

  await assert.rejects(
    () => updateCartItemQuantity(0, otherCartItem.id, "increment"),
    /在庫数を超えて数量を増やすことはできません/,
  )
  await assert.rejects(
    () => removeItemFromCart(0, otherCartItem.variantId),
    /Cart item not found/,
  )

  const storedItem = await prisma.cartItem.findUniqueOrThrow({
    where: { id: otherCartItem.id },
  })
  assert.equal(storedItem.quantity, 2)
})

test("他ユーザーの注文は注文IDを指定しても取得できない", async () => {
  const otherOrder = await prisma.order.create({
    data: {
      userId: 1,
      paymentStatus: "支払い済み",
      shippingStatus: "発送済み",
      shippingPrice: 1000,
      totalPrice: 1500,
    },
  })
  const repo = new OrderRepository()

  assert.equal(await repo.findByOrderIdForUser(otherOrder.id, 0), null)
  assert.equal((await repo.findByOrderIdForUser(otherOrder.id, 1))?.id, otherOrder.id)
})

test("カート数量は1未満にも99超にも更新できない", async () => {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: 0 } })
  const cartItem = await prisma.cartItem.create({
    data: { cartId: cart.id, variantId: 0, quantity: 1 },
  })

  await assert.rejects(
    () => updateCartItemQuantity(0, cartItem.id, "decrement"),
    /Cart item not found/,
  )
  assert.equal(
    (await prisma.cartItem.findUniqueOrThrow({ where: { id: cartItem.id } })).quantity,
    1,
  )

  await prisma.cartItem.update({
    where: { id: cartItem.id },
    data: { quantity: 99 },
  })
  await assert.rejects(
    () => updateCartItemQuantity(0, cartItem.id, "increment"),
    /在庫数を超えて数量を増やすことはできません/,
  )
  assert.equal(
    (await prisma.cartItem.findUniqueOrThrow({ where: { id: cartItem.id } })).quantity,
    99,
  )
})

test("売り切れ商品はカートへ追加できない", async () => {
  await prisma.variant.update({ where: { id: 0 }, data: { stock: 0 } })

  await assert.rejects(() => addItemToCart({ userId: 0, variantId: 0, quantity: 1 }), (error) => {
    assert.ok(error instanceof CartError)
    assert.equal(error.code, "OUT_OF_STOCK")
    return true
  })
  assert.equal(await prisma.cartItem.count({ where: { variantId: 0 } }), 0)
})

test("カート数量は現在庫を超えて増やせない", async () => {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: 0 } })
  await prisma.variant.update({ where: { id: 0 }, data: { stock: 1 } })
  const cartItem = await prisma.cartItem.create({
    data: { cartId: cart.id, variantId: 0, quantity: 1 },
  })

  await assert.rejects(
    () => updateCartItemQuantity(0, cartItem.id, "increment"),
    /在庫数を超えて数量を増やすことはできません/,
  )
  assert.equal(
    (await prisma.cartItem.findUniqueOrThrow({ where: { id: cartItem.id } })).quantity,
    1,
  )
})

test("在庫不足の場合は注文・在庫・カートを変更しない", async () => {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: 0 } })
  await prisma.variant.update({ where: { id: 0 }, data: { stock: 1 } })
  await prisma.cartItem.create({
    data: { cartId: cart.id, variantId: 0, quantity: 2 },
  })

  await assert.rejects(() => createOrderFromCart(0), (error) => {
    assert.ok(error instanceof CheckoutError)
    assert.equal(error.code, "INSUFFICIENT_STOCK")
    assert.match(error.message, /在庫が不足しています/)
    return true
  })

  assert.equal(await prisma.order.count({ where: { userId: 0 } }), 0)
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: 0 } })).stock, 1)
  assert.equal(
    (await prisma.cartItem.findUniqueOrThrow({
      where: { cartId_variantId: { cartId: cart.id, variantId: 0 } },
    })).quantity,
    2,
  )
})

test("同じ商品をカートへ追加すると数量を加算し、在庫を超える追加は拒否する", async () => {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: 0 } })
  await prisma.variant.update({ where: { id: 0 }, data: { stock: 5 } })
  const quantity = async () => (await prisma.cartItem.findUniqueOrThrow({
    where: { cartId_variantId: { cartId: cart.id, variantId: 0 } },
  })).quantity

  await addItemToCart({ userId: 0, variantId: 0, quantity: 2 })
  await addItemToCart({ userId: 0, variantId: 0, quantity: 3 })
  assert.equal(await quantity(), 5)

  await assert.rejects(() => addItemToCart({ userId: 0, variantId: 0, quantity: 1 }), (error) => {
    assert.ok(error instanceof CartError)
    assert.equal(error.code, "QUANTITY_UNAVAILABLE")
    return true
  })
  assert.equal(await quantity(), 5)
})

test("注文履歴は新しい注文から並ぶ", async () => {
  const orderData = { userId: 0, paymentStatus: INITIAL_PAYMENT_STATUS, shippingStatus: INITIAL_SHIPPING_STATUS, shippingPrice: 1000, totalPrice: 1500 }
  const older = await prisma.order.create({ data: { ...orderData, orderedAt: new Date("2026-01-01T00:00:00Z") } })
  const newer = await prisma.order.create({ data: { ...orderData, orderedAt: new Date("2026-02-01T00:00:00Z") } })
  await prisma.order.update({ where: { id: older.id }, data: { totalPrice: 1600 } })

  const orders = await new OrderRepository().findManyByUserId(0)
  assert.deepEqual(orders.map(order => order.id), [newer.id, older.id])
})
