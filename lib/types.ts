import type { SalesType } from "./salesTypes"

export type Product = {
  id: number,
  name: string,
  category: string | null,
  salesType: SalesType,
  description: string,
  thumbnailImageUrl: string,
}

export type Variant = {
  id: number,
  name: string,
  productId: number,
  price: number,
  stock: number,
  imageUrl: string
}

export type CartItemWithVariant = {
  id: number,
  cartId: number,
  variantId: number,
  quantity: number,
  variant: Variant,
}

export type Result<T, E> =
  | { ok: true, data: T }
  | { ok: false, error: E }
