// A card saved in Stripe, reduced to what the store shows.
export type SavedCard = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

const BRAND_NAMES: Record<string, string> = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
}

export function formatCardLabel(card: Pick<SavedCard, "brand" | "last4">) {
  return `${BRAND_NAMES[card.brand] ?? card.brand} •••• ${card.last4}`
}

export function formatCardExpiry(card: Pick<SavedCard, "expMonth" | "expYear">) {
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear % 100).padStart(2, "0")}`
}
