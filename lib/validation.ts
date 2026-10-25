import { shippingStatuses, type ShippingStatus } from "../services/admin/shippingStatusTransition"

export const MAX_CART_QUANTITY = 99
export const MAX_STOCK_DELTA = 9999
export const MAX_PRICE = 9_999_999

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

export function requireShippingStatus(value: unknown, fieldName: string): ShippingStatus {
  const status = shippingStatuses.find(candidate => candidate === value)
  if (status === undefined) throw new Error(`${fieldName} must be a known shipping status`)
  return status
}

// Checkbox confirmation for irreversible admin actions; an unchecked box is never submitted, and a checked one sends "on".
export function requireConfirmation(value: unknown) {
  if (value !== "on") throw new Error("confirmation is required")
}

// Decimal text with an optional sign such as "10", "+10" or "-3"; decimals and exponents are rejected.
function toSignedInteger(value: unknown) {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return /^[+-]?\d+$/.test(trimmed) ? Number(trimmed) : null
}

export function requireStockDelta(value: unknown) {
  const delta = toSignedInteger(value)
  if (delta === null || delta === 0 || Math.abs(delta) > MAX_STOCK_DELTA) {
    throw new Error(`delta must be a non-zero integer between -${MAX_STOCK_DELTA} and ${MAX_STOCK_DELTA}`)
  }
  return delta
}

export function requirePrice(value: unknown) {
  const price = toSignedInteger(value)
  if (price === null || price < 1 || price > MAX_PRICE) {
    throw new Error(`price must be an integer between 1 and ${MAX_PRICE}`)
  }
  return price
}
