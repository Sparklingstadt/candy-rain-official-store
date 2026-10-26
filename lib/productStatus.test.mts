import assert from "node:assert/strict"
import { test } from "node:test"
import { storeStatusLabel, storeStatusOf } from "./productStatus"

test("非公開の商品はバリエーションに関係なく非公開", () => {
  assert.equal(storeStatusOf({ isPublished: false, variants: [{ isPublished: true }] }), "UNPUBLISHED")
})

test("公開中で公開中のバリエーションがなければストアに未表示", () => {
  assert.equal(storeStatusOf({ isPublished: true, variants: [] }), "NOT_LISTED")
  assert.equal(storeStatusOf({ isPublished: true, variants: [{ isPublished: false }] }), "NOT_LISTED")
})

test("公開中で公開中のバリエーションがあれば公開中", () => {
  assert.equal(storeStatusOf({ isPublished: true, variants: [{ isPublished: false }, { isPublished: true }] }), "PUBLISHED")
  assert.deepEqual(storeStatusLabel, { PUBLISHED: "公開中", UNPUBLISHED: "非公開", NOT_LISTED: "ストアに未表示" })
})
