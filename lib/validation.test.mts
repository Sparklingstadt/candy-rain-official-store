import assert from "node:assert/strict"
import test from "node:test"
import {
  MAX_CART_QUANTITY,
  requireCartMutationType,
  requireCartQuantity,
  requireConfirmation,
  requireNonNegativeInteger,
  requireShippingStatus,
  requireStripeId,
  toNonNegativeInteger,
} from "./validation"

test("IDは0を含む非負整数だけを受け入れる", () => {
  assert.equal(toNonNegativeInteger("0"), 0)
  assert.equal(toNonNegativeInteger(12), 12)
  assert.equal(toNonNegativeInteger(""), null)
  assert.equal(toNonNegativeInteger("1.5"), null)
  assert.equal(toNonNegativeInteger(-1), null)
  assert.equal(toNonNegativeInteger("invalid"), null)
  assert.throws(() => requireNonNegativeInteger(undefined, "variantId"), /variantId/)
})

test("カート数量は1から上限までに制限する", () => {
  assert.equal(requireCartQuantity(1), 1)
  assert.equal(requireCartQuantity(String(MAX_CART_QUANTITY)), MAX_CART_QUANTITY)
  assert.throws(() => requireCartQuantity(0), /between 1 and 99/)
  assert.throws(() => requireCartQuantity(MAX_CART_QUANTITY + 1), /between 1 and 99/)
})

test("数量変更種別はincrementかdecrementだけを受け入れる", () => {
  assert.equal(requireCartMutationType("increment"), "increment")
  assert.equal(requireCartMutationType("decrement"), "decrement")
  assert.throws(() => requireCartMutationType("delete"), /increment or decrement/)
})

test("StripeのIDは指定したプレフィックスの英数字だけを受け入れる", () => {
  assert.equal(requireStripeId("pm_1AbC", "pm", "paymentMethodId"), "pm_1AbC")
  assert.equal(requireStripeId("pi_3XyZ", "pi", "paymentIntentId"), "pi_3XyZ")
  assert.throws(() => requireStripeId("pi_3XyZ", "pm", "paymentMethodId"), /paymentMethodId/)
  assert.throws(() => requireStripeId("pm_../x", "pm", "paymentMethodId"), /paymentMethodId/)
  assert.throws(() => requireStripeId(undefined, "pm", "paymentMethodId"), /paymentMethodId/)
})

test("発送ステータスは定義済みの値だけ受け付ける", () => {
  assert.equal(requireShippingStatus("発送済み", "nextStatus"), "発送済み")
  assert.throws(() => requireShippingStatus("配達中", "nextStatus"), /nextStatus/)
  assert.throws(() => requireShippingStatus(null, "nextStatus"), /nextStatus/)
})

test("キャンセルの確認チェックは on だけ受け付ける", () => {
  assert.doesNotThrow(() => requireConfirmation("on"))
  for (const value of [null, "", "off", "true"]) assert.throws(() => requireConfirmation(value), /confirmation/)
})
