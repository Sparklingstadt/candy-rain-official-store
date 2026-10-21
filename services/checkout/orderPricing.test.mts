import assert from "node:assert/strict"
import test from "node:test"
import { calculateCartQuantity, calculateCartSubtotal, calculateOrderTotal, calculateSubtotal } from "./orderPricing"

test("送料を含めた注文合計を計算する", () => {
  const items = [
    { quantity: 2, variant: { price: 500 } },
    { quantity: 1, variant: { price: 800 } },
  ]

  assert.equal(calculateOrderTotal(items, 1000), 2800)
})

test("商品がない場合は送料だけを返す", () => {
  assert.equal(calculateOrderTotal([], 1000), 1000)
})

test("送料無料の場合は商品小計を返す", () => {
  const items = [{ quantity: 3, variant: { price: 500 } }]

  assert.equal(calculateOrderTotal(items, 0), 1500)
})

test("単価と数量から小計を計算する", () => {
  assert.equal(calculateSubtotal([{ price: 500, quantity: 2 }, { price: 800, quantity: 1 }]), 1800)
  assert.equal(calculateSubtotal([]), 0)
})

test("カートの合計点数は各商品の数量を合計する", () => {
  assert.equal(calculateCartQuantity([{ quantity: 2 }, { quantity: 3 }]), 5)
  assert.equal(calculateCartQuantity([]), 0)
})

test("カート商品の小計はバリエーション価格から計算する", () => {
  assert.equal(calculateCartSubtotal([{ quantity: 3, variant: { price: 500 } }]), 1500)
})
