import assert from "node:assert/strict"
import { after, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { ProductRepository } from "../../repositories/implementations/productRepository"
import { VariantRepository } from "../../repositories/implementations/variantRepository"

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
