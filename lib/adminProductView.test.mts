import assert from "node:assert/strict"
import { test } from "node:test"
import { parseProductView } from "./adminProductView"

test("view=list のときだけリスト、それ以外はカード", () => {
  assert.equal(parseProductView("list"), "list")
  for (const value of [undefined, "", "card", "grid", "LIST", ["list"]]) assert.equal(parseProductView(value), "card", String(value))
})
