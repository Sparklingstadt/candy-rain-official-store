import { isPrefecture, type Prefecture } from "./prefectures"

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

// values echoes the normalized input so the form can show it again next to the errors.
export type ParseResult<F extends string, T> =
  | { success: true, data: T }
  | { success: false, fieldErrors: Partial<Record<F, string>>, values: Record<F, string> }

type FormValues = { get(name: string): unknown }

// NFKC turns full-width digits, letters and hyphens into their ASCII forms.
function readText(form: FormValues, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value.normalize("NFKC").trim() : ""
}

function textError(value: string, label: string, maxLength: number, required: boolean) {
  if (!value) return required ? `${label}を入力してください` : undefined
  if (/\p{Cc}/u.test(value)) return `${label}に使用できない文字が含まれています`
  if ([...value].length > maxLength) return `${label}は${maxLength}文字以内で入力してください`
  return undefined
}

function toResult<F extends string, T>(values: Record<F, string>, fieldErrors: Partial<Record<F, string | undefined>>, data: () => T): ParseResult<F, T> {
  const errors = Object.fromEntries(Object.entries(fieldErrors).filter(([, error]) => error)) as Partial<Record<F, string>>
  return Object.keys(errors).length > 0 ? { success: false, fieldErrors: errors, values } : { success: true, data: data() }
}

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
