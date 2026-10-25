import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { VariantRepository } from "../../repositories/implementations/variantRepository"
import { adjustStock, updatePrice } from "../../services/admin/inventoryAdminService"

// Dedicated product and variant keep this file independent of the seeded variants other integration files use in parallel.
const repo = new VariantRepository()
let productId = 0
let variantId = 0

before(async () => {
  const product = await prisma.product.create({
    data: {
      name: `admin-inventory-${Date.now()}`,
      description: "test",
      thumbnailImageUrl: "/test.png",
      variants: { create: { name: "test", price: 800, stock: 5, imageUrl: "/test.png" } },
    },
    include: { variants: true },
  })
  productId = product.id
  variantId = product.variants[0].id
})

after(async () => {
  await prisma.variant.deleteMany({ where: { productId } })
  await prisma.product.delete({ where: { id: productId } })
  await prisma.$disconnect()
})

const read = () => prisma.variant.findUniqueOrThrow({ where: { id: variantId } })

test("在庫を増減でき、更新後の在庫を返す", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 5 } })
  assert.deepEqual(await adjustStock(repo, variantId, 10), { stock: 15 })
  assert.deepEqual(await adjustStock(repo, variantId, -15), { stock: 0 })
  assert.equal((await read()).stock, 0)
})

test("0 未満になる減算は現在の在庫を示して拒否し、在庫を変えない", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 2 } })
  await assert.rejects(adjustStock(repo, variantId, -3), { code: "INSUFFICIENT_STOCK", message: "在庫が足りないため減らせません（現在の在庫: 2）" })
  assert.equal((await read()).stock, 2)
})

test("在庫の減算と購入の減算が同時に走っても、合計どおりに減り 0 未満にならない", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 10 } })
  // A purchase decrements only when enough stock remains, like checkoutService.
  const purchase = () => prisma.variant.updateMany({ where: { id: variantId, stock: { gte: 3 } }, data: { stock: { decrement: 3 } } })
  const results = await Promise.allSettled([adjustStock(repo, variantId, -4), purchase(), adjustStock(repo, variantId, -4), purchase()])
  const stock = (await read()).stock
  assert.ok(stock >= 0)
  const adjusted = [results[0], results[2]].filter(result => result.status === "fulfilled").length * 4
  const purchased = [results[1], results[3]].filter(result => result.status === "fulfilled" && result.value.count === 1).length * 3
  assert.equal(stock, 10 - adjusted - purchased)
})

test("価格は表示時の価格を条件に更新し、食い違えば STALE_PRICE で変えない", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { price: 800 } })
  await updatePrice(repo, variantId, 800, 900)
  assert.equal((await read()).price, 900)
  await assert.rejects(updatePrice(repo, variantId, 800, 1000), { code: "STALE_PRICE" })
  assert.equal((await read()).price, 900)
  await updatePrice(repo, variantId, 900, 900)
  assert.equal((await read()).price, 900)
})

test("存在しないバリエーションは VARIANT_NOT_FOUND", async () => {
  await assert.rejects(adjustStock(repo, 999_999, 1), { code: "VARIANT_NOT_FOUND" })
  await assert.rejects(updatePrice(repo, 999_999, 800, 900), { code: "VARIANT_NOT_FOUND" })
})
