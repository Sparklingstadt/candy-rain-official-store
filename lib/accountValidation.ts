import { isPrefecture, type Prefecture } from "./prefectures"
import { readText, textError, toResult, type FormValues, type ParseResult } from "./formParsing"

export type { ParseResult }

export const MAX_NAME_LENGTH = 50
export const MAX_ADDRESS_LINE_LENGTH = 100

export type ProfileInput = { firstName: string, lastName: string }
export type ShippingAddressInput = {
  postalCode: string,
  prefecture: Prefecture,
  addressLine1: string,
  addressLine2: string | null,
}

export type ProfileField = keyof ProfileInput
export type ShippingAddressField = keyof ShippingAddressInput

export function parseProfileInput(form: FormValues): ParseResult<ProfileField, ProfileInput> {
  const values = { firstName: readText(form, "firstName"), lastName: readText(form, "lastName") }
  return toResult(values, {
    firstName: textError(values.firstName, "名", MAX_NAME_LENGTH, true),
    lastName: textError(values.lastName, "姓", MAX_NAME_LENGTH, true),
  }, () => values)
}

export function parseShippingAddressInput(form: FormValues): ParseResult<ShippingAddressField, ShippingAddressInput> {
  const values = {
    postalCode: readText(form, "postalCode"),
    prefecture: readText(form, "prefecture"),
    addressLine1: readText(form, "addressLine1"),
    addressLine2: readText(form, "addressLine2"),
  }
  const postalCode = /^(\d{3})-?(\d{4})$/.exec(values.postalCode)
  const prefecture = values.prefecture

  return toResult(values, {
    postalCode: postalCode ? undefined : "郵便番号は7桁の数字で入力してください（例: 123-4567）",
    prefecture: isPrefecture(prefecture) ? undefined : "都道府県を選択してください",
    addressLine1: textError(values.addressLine1, "市区町村・番地", MAX_ADDRESS_LINE_LENGTH, true),
    addressLine2: textError(values.addressLine2, "建物名・部屋番号", MAX_ADDRESS_LINE_LENGTH, false),
  }, () => ({
    postalCode: `${postalCode![1]}-${postalCode![2]}`,
    prefecture: prefecture as Prefecture,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2 || null,
  }))
}
