import assert from "node:assert/strict"
import test from "node:test"
import { MAX_ADDRESS_LINE_LENGTH, MAX_NAME_LENGTH, parseProfileInput, parseShippingAddressInput } from "./accountValidation"

function form(values: Record<string, string>) {
  const formData = new FormData()
  for (const [name, value] of Object.entries(values)) formData.set(name, value)
  return formData
}

const address = { postalCode: "123-4567", prefecture: "東京都", addressLine1: "千代田区1-2-3", addressLine2: "" }

test("氏名は前後の空白を除いて受け入れる", () => {
  assert.deepEqual(parseProfileInput(form({ firstName: " Taro ", lastName: "Yamada" })), {
    success: true,
    data: { firstName: "Taro", lastName: "Yamada" },
  })
})

test("氏名の未入力・文字数超過・制御文字はフィールドごとに拒否する", () => {
  const result = parseProfileInput(form({ firstName: "　", lastName: "あ".repeat(MAX_NAME_LENGTH + 1) }))
  assert.ok(!result.success)
  assert.match(result.fieldErrors.firstName ?? "", /名を入力してください/)
  assert.match(result.fieldErrors.lastName ?? "", /50文字以内/)
  assert.equal(parseProfileInput(form({ firstName: "Ta\u0000ro", lastName: "Yamada" })).success, false)
  assert.equal(parseProfileInput(new FormData()).success, false)
})

test("氏名は絵文字を1文字として数える", () => {
  assert.equal(parseProfileInput(form({ firstName: "🍬".repeat(MAX_NAME_LENGTH), lastName: "Yamada" })).success, true)
})

test("郵便番号は全角やハイフンなしでも123-4567形式に正規化する", () => {
  for (const postalCode of ["1234567", "１２３－４５６７", "123-4567"]) {
    const result = parseShippingAddressInput(form({ ...address, postalCode }))
    assert.ok(result.success)
    assert.equal(result.data.postalCode, "123-4567")
  }
  for (const postalCode of ["123-456", "12-34567", "abc-defg", ""]) {
    const result = parseShippingAddressInput(form({ ...address, postalCode }))
    assert.ok(!result.success)
    assert.match(result.fieldErrors.postalCode ?? "", /7桁/)
  }
})

test("都道府県は一覧にある値だけを受け入れる", () => {
  const result = parseShippingAddressInput(form({ ...address, prefecture: "東京" }))
  assert.ok(!result.success)
  assert.ok(result.fieldErrors.prefecture)
  assert.deepEqual(Object.keys(result.fieldErrors), ["prefecture"])
  assert.equal(result.values.prefecture, "東京")
})

test("建物名・部屋番号は任意で、空なら null として保存する", () => {
  const result = parseShippingAddressInput(form(address))
  assert.ok(result.success)
  assert.equal(result.data.addressLine2, null)

  const tooLong = parseShippingAddressInput(form({ ...address, addressLine2: "a".repeat(MAX_ADDRESS_LINE_LENGTH + 1) }))
  assert.ok(!tooLong.success)
  assert.match(tooLong.fieldErrors.addressLine2 ?? "", /100文字以内/)
})

test("市区町村・番地は必須", () => {
  const result = parseShippingAddressInput(form({ ...address, addressLine1: " " }))
  assert.ok(!result.success)
  assert.match(result.fieldErrors.addressLine1 ?? "", /市区町村・番地を入力してください/)
})
