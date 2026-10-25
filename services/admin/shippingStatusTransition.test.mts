import assert from "node:assert/strict"
import test from "node:test"
import {
  canCancelOrder,
  canChangeShippingStatus,
  canRetryRefund,
  changeableShippingStatuses,
  parseShippingStatusSlug,
  shippingStatuses,
} from "./shippingStatusTransition"

const active = ["未発送", "発送準備中", "発送済み"]

test("未発送・発送準備中・発送済みの間は前後どちらにも変更できる", () => {
  for (const from of active) for (const to of active) {
    assert.equal(canChangeShippingStatus(from, to), from !== to, `${from} -> ${to}`)
  }
})

test("キャンセルへの変更・キャンセルからの変更・未知の値は拒否する", () => {
  for (const status of active) {
    assert.equal(canChangeShippingStatus(status, "キャンセル"), false)
    assert.equal(canChangeShippingStatus("キャンセル", status), false)
  }
  assert.equal(canChangeShippingStatus("未発送", "配達中"), false)
  assert.equal(canChangeShippingStatus("配達中", "未発送"), false)
})

test("キャンセルできるのは未発送・発送準備中だけ", () => {
  assert.deepEqual(shippingStatuses.map(canCancelOrder), [true, true, false, false])
})

test("変更フォームの選択肢はキャンセル以外の3つ", () => {
  assert.deepEqual([...changeableShippingStatuses], active)
})

test("発送ステータスの一覧は4つの定義済み値", () => {
  assert.deepEqual([...shippingStatuses], ["未発送", "発送準備中", "発送済み", "キャンセル"])
})

test("返金の再試行はキャンセル済みかつ返金エラーのときだけ", () => {
  assert.equal(canRetryRefund("キャンセル", "返金エラー"), true)
  assert.equal(canRetryRefund("キャンセル", "返金済み"), false)
  assert.equal(canRetryRefund("未発送", "返金エラー"), false)
})

test("絞り込みの slug を解決し、未知の値は絞り込みなしにする", () => {
  assert.equal(parseShippingStatusSlug("preparing"), "発送準備中")
  assert.equal(parseShippingStatusSlug("cancelled"), "キャンセル")
  assert.equal(parseShippingStatusSlug("foo"), null)
  assert.equal(parseShippingStatusSlug(["preparing", "shipped"]), null)
  assert.equal(parseShippingStatusSlug(undefined), null)
})
