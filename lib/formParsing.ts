// Helpers shared by the per-field form parsers (account and admin product forms).

// values echoes the normalized input so the form can show it again next to the errors.
export type ParseResult<F extends string, T> =
  | { success: true, data: T }
  | { success: false, fieldErrors: Partial<Record<F, string>>, values: Record<F, string> }

export type FormValues = { get(name: string): unknown }

// NFKC turns full-width digits, letters and hyphens into their ASCII forms.
export function readText(form: FormValues, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value.normalize("NFKC").trim() : ""
}

export function textError(value: string, label: string, maxLength: number, required: boolean) {
  if (!value) return required ? `${label}を入力してください` : undefined
  if (/\p{Cc}/u.test(value)) return `${label}に使用できない文字が含まれています`
  if ([...value].length > maxLength) return `${label}は${maxLength}文字以内で入力してください`
  return undefined
}

export function toResult<F extends string, T>(values: Record<F, string>, fieldErrors: Partial<Record<F, string | undefined>>, data: () => T): ParseResult<F, T> {
  const errors = Object.fromEntries(Object.entries(fieldErrors).filter(([, error]) => error)) as Partial<Record<F, string>>
  return Object.keys(errors).length > 0 ? { success: false, fieldErrors: errors, values } : { success: true, data: data() }
}
