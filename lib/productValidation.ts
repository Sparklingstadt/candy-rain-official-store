import { readText, textError, toResult, type FormValues, type ParseResult } from "./formParsing"
import { isCatalogImageUrl } from "./productImageCatalog"
import { salesTypes, type SalesType } from "./salesTypes"
import { requirePrice } from "./validation"

export const MAX_PRODUCT_NAME_LENGTH = 50
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 1000
export const MAX_PRODUCT_CATEGORY_LENGTH = 30
export const MAX_VARIANT_NAME_LENGTH = 30
export const MAX_INITIAL_STOCK = 9999

export type ProductInput = {
  name: string,
  description: string,
  category: string | null,
  salesType: SalesType,
  thumbnailImageUrl: string,
}
export type VariantInput = { name: string, price: number, stock: number, imageUrl: string }
export type VariantUpdateInput = { name: string, imageUrl: string }

export type ProductField = keyof ProductInput
export type VariantField = keyof VariantInput
export type VariantUpdateField = keyof VariantUpdateInput

const IMAGE_ERROR = "画像を選択してください"

// Descriptions are multi-line, so line breaks are kept (as \n) while other control characters are rejected.
function readMultilineText(form: FormValues, name: string) {
  return readText(form, name).replace(/\r\n?/g, "\n")
}

function descriptionError(value: string) {
  if (/(?!\n)\p{Cc}/u.test(value)) return "説明に使用できない文字が含まれています"
  if ([...value].length > MAX_PRODUCT_DESCRIPTION_LENGTH) return `説明は${MAX_PRODUCT_DESCRIPTION_LENGTH}文字以内で入力してください`
  return undefined
}

function toSalesType(value: string) {
  return salesTypes.find(type => type === value)
}

function toPrice(value: string) {
  try {
    return requirePrice(value)
  } catch {
    return null
  }
}

function toInitialStock(value: string) {
  return /^\d+$/.test(value) && Number(value) <= MAX_INITIAL_STOCK ? Number(value) : null
}

export function productFormValues(form: FormValues): Record<ProductField, string> {
  return {
    name: readText(form, "name"),
    description: readMultilineText(form, "description"),
    category: readText(form, "category"),
    salesType: readText(form, "salesType"),
    thumbnailImageUrl: readText(form, "thumbnailImageUrl"),
  }
}

export function variantFormValues(form: FormValues): Record<VariantField, string> {
  return {
    name: readText(form, "name"),
    price: readText(form, "price"),
    stock: readText(form, "stock"),
    imageUrl: readText(form, "imageUrl"),
  }
}

export function variantUpdateFormValues(form: FormValues): Record<VariantUpdateField, string> {
  return { name: readText(form, "name"), imageUrl: readText(form, "imageUrl") }
}

export function parseProductInput(form: FormValues): ParseResult<ProductField, ProductInput> {
  const values = productFormValues(form)
  const salesType = toSalesType(values.salesType)

  return toResult(values, {
    name: textError(values.name, "商品名", MAX_PRODUCT_NAME_LENGTH, true),
    description: descriptionError(values.description),
    category: textError(values.category, "カテゴリ", MAX_PRODUCT_CATEGORY_LENGTH, false),
    salesType: salesType ? undefined : "販売区分を選択してください",
    thumbnailImageUrl: isCatalogImageUrl(values.thumbnailImageUrl) ? undefined : IMAGE_ERROR,
  }, () => ({
    name: values.name,
    description: values.description,
    category: values.category || null,
    salesType: salesType!,
    thumbnailImageUrl: values.thumbnailImageUrl,
  }))
}

export function parseVariantInput(form: FormValues): ParseResult<VariantField, VariantInput> {
  const values = variantFormValues(form)
  const price = toPrice(values.price)
  const stock = toInitialStock(values.stock)

  return toResult(values, {
    name: textError(values.name, "バリエーション名", MAX_VARIANT_NAME_LENGTH, true),
    price: price === null ? "価格は1〜9,999,999の整数で入力してください" : undefined,
    stock: stock === null ? "在庫は0〜9,999の整数で入力してください" : undefined,
    imageUrl: isCatalogImageUrl(values.imageUrl) ? undefined : IMAGE_ERROR,
  }, () => ({ name: values.name, price: price!, stock: stock!, imageUrl: values.imageUrl }))
}

export function parseVariantUpdateInput(form: FormValues): ParseResult<VariantUpdateField, VariantUpdateInput> {
  const values = variantUpdateFormValues(form)

  return toResult(values, {
    name: textError(values.name, "バリエーション名", MAX_VARIANT_NAME_LENGTH, true),
    imageUrl: isCatalogImageUrl(values.imageUrl) ? undefined : IMAGE_ERROR,
  }, () => values)
}
