import type { SavedCard } from "@/lib/cards"

export type PaymentAuthorization = {
  id: string
  // authorized: the amount is held and can be captured.
  status: "authorized" | "requires_action" | "failed"
  amount: number
  customerId: string | null
  paymentMethodId: string | null
  clientSecret: string | null
}

// Boundary to the payment provider so checkout can be tested without network calls.
export interface PaymentGateway {
  createCustomer(userId: number): Promise<string>
  createCardSetup(customerId: string): Promise<{ clientSecret: string }>
  listCards(customerId: string): Promise<SavedCard[]>
  findCard(customerId: string, paymentMethodId: string): Promise<SavedCard | null>
  removeCard(customerId: string, paymentMethodId: string): Promise<boolean>
  authorize(input: { customerId: string, paymentMethodId: string, amount: number, userId: number }): Promise<PaymentAuthorization>
  retrieve(paymentIntentId: string): Promise<PaymentAuthorization>
  capture(paymentIntentId: string): Promise<void>
  cancel(paymentIntentId: string): Promise<void>
  // Gives the money back for a payment, whether it was only held or already captured. Safe to repeat with the same key.
  refund(paymentIntentId: string, idempotencyKey: string): Promise<void>
}
