import assert from "node:assert/strict"
import test from "node:test"
import { formatOrderDateTime, formatPrice } from "./format"

test("注文日時は日本時間の年月日と時刻で表示する", () => {
  assert.equal(formatOrderDateTime(new Date("2026-10-19T16:59:23Z")), "2026年10月20日 1:59")
  assert.equal(formatOrderDateTime(new Date("2026-01-05T03:07:00Z")), "2026年1月5日 12:07")
})

test("価格は円記号と3桁区切りで表示する", () => {
  assert.equal(formatPrice(0), "¥0")
  assert.equal(formatPrice(800), "¥800")
  assert.equal(formatPrice(1500), "¥1,500")
  assert.equal(formatPrice(1234567), "¥1,234,567")
})
