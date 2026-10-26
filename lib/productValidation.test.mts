import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MAX_PRODUCT_CATEGORY_LENGTH,
  MAX_PRODUCT_DESCRIPTION_LENGTH,
  MAX_PRODUCT_NAME_LENGTH,
  MAX_VARIANT_NAME_LENGTH,
  parseProductInput,
  parseVariantInput,
  parseVariantUpdateInput,
} from "./productValidation"

const IMAGE = "/products/candy/product-0.webp"

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const product = (overrides: Record<string, string> = {}) =>
  form({ name: "缶バッジ", description: "", category: "", salesType: "PERMANENT", thumbnailImageUrl: IMAGE, ...overrides })

const variant = (overrides: Record<string, string> = {}) =>
  form({ name: "ピンク", price: "800", stock: "10", imageUrl: IMAGE, ...overrides })

test("商品の入力を正規化して受け付ける", () => {
  const result = parseProductInput(product({ name: " ＡＢＣ缶 ", description: "1行目\r\n2行目", category: "" }))
  assert.deepEqual(result, {
    success: true,
    data: { name: "ABC缶", description: "1行目\n2行目", category: null, salesType: "PERMANENT", thumbnailImageUrl: IMAGE },
  })
})

test("説明が空でも受け付ける", () => {
  const result = parseProductInput(product({ description: "" }))
  assert.equal(result.success, true)
  assert.equal(result.success && result.data.description, "")
})

test("商品名は 50 文字まで", () => {
  assert.equal(parseProductInput(product({ name: "あ".repeat(MAX_PRODUCT_NAME_LENGTH) })).success, true)
  const tooLong = parseProductInput(product({ name: "あ".repeat(MAX_PRODUCT_NAME_LENGTH + 1) }))
  assert.equal(!tooLong.success && tooLong.fieldErrors.name, "商品名は50文字以内で入力してください")
  const empty = parseProductInput(product({ name: "  " }))
  assert.equal(!empty.success && empty.fieldErrors.name, "商品名を入力してください")
})

test("説明は 1,000 文字、カテゴリは 30 文字まで", () => {
  const result = parseProductInput(product({
    description: "あ".repeat(MAX_PRODUCT_DESCRIPTION_LENGTH + 1),
    category: "あ".repeat(MAX_PRODUCT_CATEGORY_LENGTH + 1),
  }))
  assert.equal(!result.success && result.fieldErrors.description, "説明は1000文字以内で入力してください")
  assert.equal(!result.success && result.fieldErrors.category, "カテゴリは30文字以内で入力してください")
  assert.equal(parseProductInput(product({ category: "あ".repeat(MAX_PRODUCT_CATEGORY_LENGTH) })).success, true)
})

test("説明は改行以外の制御文字を拒否する", () => {
  const result = parseProductInput(product({ description: "a\u0000b" }))
  assert.equal(!result.success && result.fieldErrors.description, "説明に使用できない文字が含まれています")
})

test("販売区分と画像は既知の値だけ", () => {
  const result = parseProductInput(product({ salesType: "OTHER", thumbnailImageUrl: "/x.png" }))
  assert.equal(result.success, false)
  assert.equal(!result.success && result.fieldErrors.salesType, "販売区分を選択してください")
  assert.equal(!result.success && result.fieldErrors.thumbnailImageUrl, "画像を選択してください")
  assert.equal(!result.success && result.values.salesType, "OTHER")
  assert.equal(!result.success && result.values.name, "缶バッジ")
})

test("バリエーションの価格と初期在庫は全角数字も受け付ける", () => {
  assert.deepEqual(parseVariantInput(variant({ price: "１２００", stock: "１０" })), {
    success: true,
    data: { name: "ピンク", price: 1200, stock: 10, imageUrl: IMAGE },
  })
})

test("初期在庫は 0〜9,999 の整数", () => {
  for (const stock of ["0", "9999"]) assert.equal(parseVariantInput(variant({ stock })).success, true, stock)
  for (const stock of ["-1", "10000", "1.5", ""]) {
    const result = parseVariantInput(variant({ stock }))
    assert.equal(!result.success && result.fieldErrors.stock, "在庫は0〜9,999の整数で入力してください", stock)
  }
})

test("価格は 1〜9,999,999 の整数", () => {
  assert.equal(parseVariantInput(variant({ price: "9999999" })).success, true)
  for (const price of ["0", "10000000", "1.5", ""]) {
    const result = parseVariantInput(variant({ price }))
    assert.equal(!result.success && result.fieldErrors.price, "価格は1〜9,999,999の整数で入力してください", price)
  }
})

test("バリエーション名は 30 文字まで、更新は名前と画像だけを検証する", () => {
  const tooLong = parseVariantInput(variant({ name: "あ".repeat(MAX_VARIANT_NAME_LENGTH + 1) }))
  assert.equal(!tooLong.success && tooLong.fieldErrors.name, "バリエーション名は30文字以内で入力してください")
  assert.deepEqual(parseVariantUpdateInput(form({ name: " ブルー ", imageUrl: IMAGE })), {
    success: true,
    data: { name: "ブルー", imageUrl: IMAGE },
  })
  const invalid = parseVariantUpdateInput(form({ name: "", imageUrl: "https://example.com/a.webp" }))
  assert.equal(!invalid.success && invalid.fieldErrors.name, "バリエーション名を入力してください")
  assert.equal(!invalid.success && invalid.fieldErrors.imageUrl, "画像を選択してください")
})
