import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync, existsSync } from "node:fs"
import { getProductImageUrl, getVariantImageUrl } from "./product-images"
import { isCatalogImageUrl, productImageCatalog } from "./productImageCatalog"

const mapping = JSON.parse(readFileSync(new URL("../assets/candy-collection/shop-assets/image-mapping.json", import.meta.url), "utf8"))

test("all 5 products and 10 variants resolve legacy DB URLs to existing Blender images", () => {
  assert.equal(mapping.products.length, 5)
  assert.equal(mapping.variants.length, 10)
  for (const entry of mapping.products) {
    const url = getProductImageUrl({ ...entry, thumbnailImageUrl: "/products/Rectangle 1.png" })
    assert.equal(url, entry.thumbnailImageUrl)
    assert.ok(existsSync(new URL("../public" + url, import.meta.url)))
  }
  for (const entry of mapping.variants) {
    const url = getVariantImageUrl({ ...entry, imageUrl: "/products/Rectangle 3.png" })
    assert.equal(url, entry.imageUrl)
    assert.ok(existsSync(new URL("../public" + url, import.meta.url)))
  }
})

test("unrelated products and variants keep their own images", () => {
  assert.equal(getProductImageUrl({ id: 100, name: "Other", thumbnailImageUrl: "/custom.png" }), "/custom.png")
  assert.equal(getProductImageUrl({ ...mapping.products[0], name: "Other", thumbnailImageUrl: "/custom.png" }), "/custom.png")
  assert.equal(getVariantImageUrl({ ...mapping.variants[0], productId: 100, imageUrl: "/custom.png" }), "/custom.png")
  assert.equal(getVariantImageUrl({ ...mapping.variants[0], name: "Other", imageUrl: "/custom.png" }), "/custom.png")
})

test("DB URLs from the selectable catalog take precedence over the mapping", () => {
  const product = mapping.products[0]
  assert.equal(getProductImageUrl({ ...product, thumbnailImageUrl: "/products/candy/product-3.webp" }), "/products/candy/product-3.webp")
  const variant = mapping.variants[0]
  assert.equal(getVariantImageUrl({ ...variant, imageUrl: "/products/candy/variant-5.webp" }), "/products/candy/variant-5.webp")
})

test("the catalog lists 15 images that exist in public and matches URLs exactly", () => {
  assert.equal(productImageCatalog.length, 15)
  for (const image of productImageCatalog) {
    assert.ok(image.label)
    assert.ok(existsSync(new URL("../public" + image.url, import.meta.url)))
  }
  assert.equal(isCatalogImageUrl("/products/candy/product-0.webp"), true)
  assert.equal(isCatalogImageUrl("/products/candy/../candy/product-0.webp"), false)
  assert.equal(isCatalogImageUrl("https://example.com/products/candy/product-0.webp"), false)
})
