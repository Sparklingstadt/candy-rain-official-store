import assert from "node:assert/strict"
import test from "node:test"
import { parseSalesTypeSlug, salesTypeMeta, salesTypes } from "./salesTypes"

test("4つの販売区分にラベルとスラッグがある", () => {
  assert.deepEqual(salesTypes.map(type => salesTypeMeta[type].label), ["事前販売", "受注販売", "事後通販", "常設"])
  assert.equal(new Set(salesTypes.map(type => salesTypeMeta[type].slug)).size, salesTypes.length)
})

test("スラッグから販売区分を解決する", () => {
  for (const type of salesTypes) assert.equal(parseSalesTypeSlug(salesTypeMeta[type].slug), type)
})

test("未知・未指定・複数指定のスラッグは絞り込みなしとして扱う", () => {
  assert.equal(parseSalesTypeSlug(undefined), null)
  assert.equal(parseSalesTypeSlug(""), null)
  assert.equal(parseSalesTypeSlug("PRE_SALE"), null)
  assert.equal(parseSalesTypeSlug("unknown"), null)
  assert.equal(parseSalesTypeSlug(["pre-sale", "permanent"]), null)
})
