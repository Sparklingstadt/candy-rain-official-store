export const MAX_CART_QUANTITY = 99

// A cart line can never exceed the variant's stock or the per-line limit.
export function maxCartQuantityFor(stock: number) {
  return Math.min(stock, MAX_CART_QUANTITY)
}

export function toNonNegativeInteger(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return null

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export function requireNonNegativeInteger(value: unknown, fieldName: string) {
  const parsed = toNonNegativeInteger(value)
  if (parsed === null) throw new Error(`${fieldName} must be a non-negative integer`)
  return parsed
}

export function requireCartQuantity(value: unknown) {
  const quantity = requireNonNegativeInteger(value, "quantity")
  if (quantity < 1 || quantity > MAX_CART_QUANTITY) {
    throw new Error(`quantity must be between 1 and ${MAX_CART_QUANTITY}`)
  }
  return quantity
}

export function requireCartMutationType(value: unknown) {
  if (value !== "increment" && value !== "decrement") {
    throw new Error("type must be increment or decrement")
  }
  return value
}

// Stripe object IDs such as pm_... and pi_... sent back from the browser.
export function requireStripeId(value: unknown, prefix: "pm" | "pi", fieldName: string) {
  if (typeof value !== "string" || !new RegExp(`^${prefix}_[A-Za-z0-9]{1,255}$`).test(value)) {
    throw new Error(`${fieldName} must be a Stripe ${prefix}_ ID`)
  }
  return value
}
