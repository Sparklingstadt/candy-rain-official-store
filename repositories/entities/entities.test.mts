import assert from "node:assert/strict"
import test from "node:test"
import { Cart } from "./Cart"
import { CartItem } from "./CartItem"
import { Order } from "./Order"
import { OrderItem } from "./OrderItem"
import { Product } from "./Product"
import { User } from "./User"
import { Variant } from "./Variant"

test("seedで使用するID 0の商品を生成できる", () => {
  const product = new Product(0, "商品", null, "PERMANENT", "", "/product.png")

  assert.equal(product.id, 0)
  assert.equal(product.category, null)
  assert.equal(product.salesType, "PERMANENT")
  assert.equal(product.description, "")
})

test("seedで使用するID 0のユーザーを生成できる", () => {
  const user = new User(0, "Taro", "Yamada")

  assert.equal(user.id, 0)
})

test("負のIDは拒否する", () => {
  assert.throws(
    () => new Product(-1, "商品", null, "PERMANENT", "", "/product.png"),
    /id must be non-negative/
  )
})

test("ID 0を含む関連Entityを生成できる", () => {
  const cart = new Cart(0, 0)
  const cartItem = new CartItem(0, 0, 1, 0)
  const variant = new Variant(0, "バリエーション", 0, 500, 50, "/variant.png")
  const orderedAt = new Date("2026-01-01T00:00:00.000Z")
  const order = new Order(0, "支払い済み", "発送済み", 1000, 1500, orderedAt, 0)
  const orderItem = new OrderItem(0, 0, 0, "バリエーション", 500, 1)

  assert.equal(cart.userId, 0)
  assert.equal(cartItem.variantId, 0)
  assert.equal(variant.productId, 0)
  assert.equal(order.userId, 0)
  assert.equal(order.orderedAt, orderedAt)
  assert.equal(orderItem.orderId, 0)
})

test("関連IDが負の場合は拒否する", () => {
  assert.throws(() => new Cart(0, -1), /userId must be non-negative/)
  assert.throws(() => new CartItem(0, -1, 1, 0), /cartId must be non-negative/)
  assert.throws(() => new Variant(0, "商品", -1, 500, 50, "/variant.png"), /productId must be non-negative/)
  assert.throws(() => new OrderItem(0, -1, 0, "商品", 500, 1), /orderId must be non-negative/)
})

test("必須文字列が空の場合は拒否する", () => {
  assert.throws(() => new Product(0, "", null, "PERMANENT", "", "/product.png"), /name is required/)
  assert.throws(() => new Product(0, "商品", null, "PERMANENT", "", ""), /thumbnailImageUrl is required/)
  assert.throws(() => new User(0, "", "Yamada"), /firstName is required/)
  assert.throws(() => new User(0, "Taro", ""), /lastName is required/)
  assert.throws(() => new Variant(0, "", 0, 500, 50, "/variant.png"), /name is required/)
})

test("数量が正の整数でない場合は拒否する", () => {
  assert.throws(() => new CartItem(0, 0, 0, 0), /quantity must be a positive integer/)
  assert.throws(() => new CartItem(0, 0, -1, 0), /quantity must be a positive integer/)
  assert.throws(() => new CartItem(0, 0, 1.5, 0), /quantity must be a positive integer/)
  assert.throws(() => new OrderItem(0, 0, 0, "商品", 500, 0), /quantity is required/)
})

test("注文ステータスが空の場合は拒否する", () => {
  const orderedAt = new Date("2026-01-01T00:00:00.000Z")

  assert.throws(() => new Order(0, "", "発送済み", 1000, 1500, orderedAt, 0), /paymentStatus is required/)
  assert.throws(() => new Order(0, "支払い済み", "", 1000, 1500, orderedAt, 0), /shippingStatus is required/)
})
