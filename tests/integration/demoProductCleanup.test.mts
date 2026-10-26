import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { deleteUnorderedProducts, findDemoProducts } from "../../services/admin/demoProductCleanup"
import { INITIAL_PAYMENT_STATUS, INITIAL_SHIPPING_STATUS } from "../../services/checkout/orderStatus"

// Other integration files create products in parallel, so every assertion is limited to the products made here.
const PREFIX = `demo-cleanup-${Date.now()}`
const IMAGE = "/products/candy/product-0.webp"
let userId = 0

async function createProduct(label: string) {
  return prisma.product.create({
    data: {
      name: `${PREFIX}-${label}`,
      description: "",
      thumbnailImageUrl: IMAGE,
      variants: { create: [{ name: `${label}-a`, price: 500, stock: 5, imageUrl: IMAGE }, { name: `${label}-b`, price: 500, stock: 5, imageUrl: IMAGE }] },
    },
    include: { variants: { orderBy: { id: "asc" } } },
  })
}

async function orderVariant(variantId: number) {
  await prisma.order.create({
    data: {
      userId,
      paymentStatus: INITIAL_PAYMENT_STATUS,
      shippingStatus: INITIAL_SHIPPING_STATUS,
      shippingPrice: 1000,
      totalPrice: 1500,
      orderItems: { create: { variantId, variantName: "ordered", priceAtPurchase: 500, quantity: 1 } },
    },
  })
}

async function addToCart(variantId: number) {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } })
  await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity: 1 } })
}

before(async () => {
  const user = await prisma.user.create({
    data: { email: `${PREFIX}@example.test`, passwordHash: "-", firstName: "Demo", lastName: "Cleanup", carts: { create: {} } },
  })
  userId = user.id
})

after(async () => {
  const products = { name: { startsWith: PREFIX } }
  await prisma.orderItem.deleteMany({ where: { order: { userId } } })
  await prisma.order.deleteMany({ where: { userId } })
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } })
  await prisma.variant.deleteMany({ where: { product: products } })
  await prisma.product.deleteMany({ where: products })
  await prisma.cart.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
})

const mine = <T extends { id: number }>(products: T[], ids: number[]) => products.filter(product => ids.includes(product.id))

test("ID 5 以上の商品を、注文に使われたかどうかで分けて返し、何も消さない", async () => {
  const unordered = await createProduct("unordered")
  const ordered = await createProduct("ordered")
  await orderVariant(ordered.variants[1].id)
  const ids = [unordered.id, ordered.id]

  const products = mine(await findDemoProducts(), ids)
  assert.deepEqual(products.map(product => [product.id, product.hasOrders]), [[unordered.id, false], [ordered.id, true]])
  assert.equal(products[0].name, `${PREFIX}-unordered`)
  assert.equal((await findDemoProducts()).some(product => product.id < 5), false)
  assert.equal(await prisma.product.count({ where: { id: { in: ids } } }), 2)
})

test("注文のない商品はカート行・バリエーションごと削除し、注文済みの商品は残す", async () => {
  const unordered = await createProduct("delete")
  const ordered = await createProduct("keep")
  await addToCart(unordered.variants[0].id)
  await orderVariant(ordered.variants[0].id)

  assert.deepEqual(await deleteUnorderedProducts([unordered.id, ordered.id]), [unordered.id])
  assert.equal(await prisma.product.count({ where: { id: unordered.id } }), 0)
  assert.equal(await prisma.variant.count({ where: { productId: unordered.id } }), 0)
  assert.equal(await prisma.cartItem.count({ where: { variant: { productId: unordered.id } } }), 0)
  assert.equal(await prisma.variant.count({ where: { productId: ordered.id } }), 2)
  assert.equal(await prisma.orderItem.count({ where: { variant: { productId: ordered.id } } }), 1)
})

test("シードの商品（ID 0〜4）は指定されても削除しない", async () => {
  assert.deepEqual(await deleteUnorderedProducts([0, 4]), [])
  assert.equal(await prisma.product.count({ where: { id: { in: [0, 4] } } }), 2)
})
