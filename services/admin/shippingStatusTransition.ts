import {
  CANCELLED_SHIPPING_STATUS,
  INITIAL_SHIPPING_STATUS,
  PREPARING_SHIPPING_STATUS,
  REFUNDED_PAYMENT_STATUS,
  SHIPPED_SHIPPING_STATUS,
} from "../checkout/orderStatus"

// Pure rules for the admin shipping screen. Kept free of Prisma and server-only imports so client components can use the types and labels.
export const shippingStatuses = [
  INITIAL_SHIPPING_STATUS,
  PREPARING_SHIPPING_STATUS,
  SHIPPED_SHIPPING_STATUS,
  CANCELLED_SHIPPING_STATUS,
] as const
export type ShippingStatus = (typeof shippingStatuses)[number]

export const shippingStatusSlugs: Record<ShippingStatus, string> = {
  [INITIAL_SHIPPING_STATUS]: "unshipped",
  [PREPARING_SHIPPING_STATUS]: "preparing",
  [SHIPPED_SHIPPING_STATUS]: "shipped",
  [CANCELLED_SHIPPING_STATUS]: "cancelled",
}

// Resolves the ?shippingStatus= query value; anything unknown means "no filter".
export function parseShippingStatusSlug(slug: string | string[] | undefined): ShippingStatus | null {
  if (typeof slug !== "string") return null
  return shippingStatuses.find(status => shippingStatusSlugs[status] === slug) ?? null
}

// Choices for the change form. Cancelling has its own action, so it is not listed here.
export const changeableShippingStatuses = [
  INITIAL_SHIPPING_STATUS,
  PREPARING_SHIPPING_STATUS,
  SHIPPED_SHIPPING_STATUS,
] as const

const changeable = new Set<string>(changeableShippingStatuses)
const cancellable = new Set<string>([INITIAL_SHIPPING_STATUS, PREPARING_SHIPPING_STATUS])

// Changes move freely among the three active statuses. Cancelled orders are final and cannot be reached by a plain change.
export function canChangeShippingStatus(from: string, to: string): boolean {
  return from !== to && changeable.has(from) && changeable.has(to)
}

export function canCancelOrder(shippingStatus: string): boolean {
  return cancellable.has(shippingStatus)
}

// A cancelled order with a payment can be refunded again until it is recorded as refunded. This covers a failed refund
// and also a cancellation whose process died (or whose status write failed) before the refund outcome was saved.
export function canRetryRefund(shippingStatus: string, paymentStatus: string, hasPayment: boolean): boolean {
  return shippingStatus === CANCELLED_SHIPPING_STATUS && hasPayment && paymentStatus !== REFUNDED_PAYMENT_STATUS
}
