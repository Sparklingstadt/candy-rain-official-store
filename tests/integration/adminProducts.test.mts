import assert from "node:assert/strict"
import { after, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { ProductRepository } from "../../repositories/implementations/productRepository"
import { VariantRepository } from "../../repositories/implementations/variantRepository"
import {
  createProduct as createProductAsAdmin,
  createVariant,
  setProductPublished,
  setVariantPublished,
  updateProduct,
  updateVariant,
} from "../../services/admin/productAdminService"

// Every product made here carries this prefix so cleanup never touches the seeded catalog other files use in parallel.
const PREFIX = `admin-products-${Date.now()}`
const IMAGE = "/products/candy/product-0.webp"
const productRepo = new ProductRepository()
const variantRepo = new VariantRepository()

async function createProduct(label: string, isPublished: boolean, variants: { name: string, isPublished: boolean }[]) {
  return prisma.product.create({
    data: {
      name: `${PREFIX}-${label}`,
      description: "",
      thumbnailImageUrl: IMAGE,
      isPublished,
      variants: { create: variants.map(variant => ({ ...variant, price: 800, stock: 5, imageUrl: IMAGE })) },
    },
    include: { variants: { orderBy: { id: "asc" } } },
  })
}

after(async () => {
  const where = { product: { name: { startsWith: PREFIX } } }
  await prisma.cartItem.deleteMany({ where: { variant: where } })
  await prisma.variant.deleteMany({ where })
  await prisma.product.deleteMany({ where: { name: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

test("ストア用の読み取りは非公開の商品と、公開中のバリエーションがない商品を返さない", async () => {
  const listed = await createProduct("listed", true, [{ name: "v1", isPublished: true }, { name: "v2", isPublished: false }])
  const hidden = await createProduct("hidden", false, [{ name: "v3", isPublished: true }])
  const empty = await createProduct("empty", true, [{ name: "v4", isPublished: false }])

  const products = (await productRepo.findManyWithVariants()).filter(product => product.name.startsWith(PREFIX))
  assert.deepEqual(products.map(product => product.id), [listed.id])
  assert.deepEqual(products[0].variants.map(variant => variant.name), ["v1"])

  assert.equal((await productRepo.findById(listed.id))?.id, listed.id)
  assert.equal(await productRepo.findById(hidden.id), null)
  assert.equal(await productRepo.findById(empty.id), null)
  assert.deepEqual((await variantRepo.findManyByProductId(listed.id)).map(variant => variant.name), ["v1"])
})

test("最後の公開バリエーションを非公開にすると商品がストアから消える", async () => {
  const product = await createProduct("last", true, [{ name: "only", isPublished: true }])
  assert.equal((await productRepo.findById(product.id))?.id, product.id)

  await prisma.variant.update({ where: { id: product.variants[0].id }, data: { isPublished: false } })
  assert.equal(await productRepo.findById(product.id), null)
  assert.equal((await productRepo.findManyWithVariants()).some(listed => listed.id === product.id), false)
})

const productInput = (label: string) => ({
  name: `${PREFIX}-${label}`,
  description: "説明",
  category: "グッズ",
  salesType: "PRE_SALE" as const,
  thumbnailImageUrl: "/products/candy/product-1.webp",
})
const variantInput = { name: "ミント", price: 1200, stock: 3, imageUrl: "/products/candy/variant-1.webp" }

test("作成した商品とバリエーションは非公開になる", async () => {
  const { id: productId } = await createProductAsAdmin(productRepo, productInput("created"))
  const { id: variantId } = await createVariant(productRepo, variantRepo, productId, variantInput)

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: true } })
  assert.equal(product.isPublished, false)
  assert.equal(product.category, "グッズ")
  assert.deepEqual(product.variants.map(variant => [variant.id, variant.isPublished, variant.price, variant.stock]), [[variantId, false, 1200, 3]])
})

test("商品とバリエーションの更新が反映される", async () => {
  const product = await createProduct("update", false, [{ name: "before", isPublished: false }])
  await updateProduct(productRepo, product.id, { ...productInput("updated"), category: null, salesType: "POST_EVENT" })
  await updateVariant(variantRepo, product.id, product.variants[0].id, { name: "after", imageUrl: "/products/candy/variant-2.webp" })

  const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } })
  assert.equal(stored.name, `${PREFIX}-updated`)
  assert.equal(stored.category, null)
  assert.equal(stored.salesType, "POST_EVENT")
  assert.deepEqual([stored.variants[0].name, stored.variants[0].imageUrl], ["after", "/products/candy/variant-2.webp"])
})

test("別の商品のバリエーションは更新も公開設定もできない", async () => {
  const owner = await createProduct("owner", false, [{ name: "owned", isPublished: false }])
  const other = await createProduct("other", false, [])
  const variantId = owner.variants[0].id

  await assert.rejects(updateVariant(variantRepo, other.id, variantId, { name: "hijacked", imageUrl: IMAGE }), { code: "VARIANT_NOT_FOUND", message: "バリエーションが見つかりません" })
  await assert.rejects(setVariantPublished(variantRepo, other.id, variantId, true), { code: "VARIANT_NOT_FOUND" })
  const stored = await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })
  assert.deepEqual([stored.name, stored.isPublished], ["owned", false])
})

test("存在しない商品は PRODUCT_NOT_FOUND", async () => {
  const notFound = { code: "PRODUCT_NOT_FOUND", message: "商品が見つかりません" }
  await assert.rejects(updateProduct(productRepo, 999_999, productInput("missing")), notFound)
  await assert.rejects(setProductPublished(productRepo, 999_999, true), notFound)
  await assert.rejects(createVariant(productRepo, variantRepo, 999_999, variantInput), notFound)
})

test("公開設定は同じ値を 2 回送っても成功し、状態が変わらない", async () => {
  const product = await createProduct("publish", false, [{ name: "v", isPublished: false }])
  for (let i = 0; i < 2; i++) {
    await setProductPublished(productRepo, product.id, true)
    await setVariantPublished(variantRepo, product.id, product.variants[0].id, true)
  }
  const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } })
  assert.deepEqual([stored.isPublished, stored.variants[0].isPublished], [true, true])
  await setProductPublished(productRepo, product.id, false)
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).isPublished, false)
})

test("上限に達すると作成しない", async () => {
  // The seeded catalog already has 5 products, so a limit of 1 is always reached.
  const before = await prisma.product.count({ where: { name: { startsWith: PREFIX } } })
  await assert.rejects(createProductAsAdmin(productRepo, productInput("over"), 1), { code: "PRODUCT_LIMIT", message: "登録できる商品は 1 件までです" })
  assert.equal(await prisma.product.count({ where: { name: { startsWith: PREFIX } } }), before)

  const product = await createProduct("full", false, [{ name: "a", isPublished: false }, { name: "b", isPublished: false }])
  await assert.rejects(createVariant(productRepo, variantRepo, product.id, variantInput, 2), { code: "VARIANT_LIMIT", message: "1 つの商品に登録できるバリエーションは 2 件までです" })
  assert.equal(await prisma.variant.count({ where: { productId: product.id } }), 2)
})
