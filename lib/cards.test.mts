import assert from "node:assert/strict"
import test from "node:test"
import { formatCardExpiry, formatCardLabel } from "./cards"

test("カードはブランド名と下4桁で表示する", () => {
  assert.equal(formatCardLabel({ brand: "visa", last4: "4242" }), "Visa •••• 4242")
  assert.equal(formatCardLabel({ brand: "jcb", last4: "0000" }), "JCB •••• 0000")
  assert.equal(formatCardLabel({ brand: "unknown", last4: "1234" }), "unknown •••• 1234")
})

test("有効期限はMM/YY形式で表示する", () => {
  assert.equal(formatCardExpiry({ expMonth: 4, expYear: 2034 }), "04/34")
  assert.equal(formatCardExpiry({ expMonth: 12, expYear: 2100 }), "12/00")
})
