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
  variant: Variant & { isPublished: boolean, product: { isPublished: boolean } },
}

// Return shape shared by Server Actions; expected failures carry a message for the UI.
export type ActionResult<T = object> =
  | ({ success: true } & T)
  | { success: false, message: string }

// State for forms that show per-field errors next to the submitted values.
export type FormActionState<F extends string> =
  | { success: true }
  | { success: false, message: string, fieldErrors: Partial<Record<F, string>>, values: Record<F, string> }
