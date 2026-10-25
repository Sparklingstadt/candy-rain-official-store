import type { SavedCard } from "../../lib/cards"
import type { PaymentAuthorization, PaymentGateway } from "../../services/payment/paymentGateway"

export const FAKE_CUSTOMER_ID = "cus_fake"
export const FAKE_CARD: SavedCard = { id: "pm_visa", brand: "visa", last4: "4242", expMonth: 12, expYear: 2034 }

// In-memory stand-in for the payment provider so services can be tested without network calls.
export class FakeGateway implements PaymentGateway {
  authorizeStatus: PaymentAuthorization["status"] = "authorized"
  captureFails = false
  refundFails = false
  readonly payments = new Map<string, PaymentAuthorization>()
  readonly calls: string[] = []
  readonly refunds: { paymentIntentId: string, idempotencyKey: string }[] = []

  constructor(private readonly customerId: string = FAKE_CUSTOMER_ID, private readonly card: SavedCard = FAKE_CARD) {}

  async createCustomer() { return this.customerId }
  async createCardSetup() { return { clientSecret: "seti_secret" } }
  async listCards() { return [this.card] }
  async findCard(customerId: string, paymentMethodId: string) {
    return customerId === this.customerId && paymentMethodId === this.card.id ? this.card : null
  }
  async removeCard() { return true }
  async authorize({ customerId, paymentMethodId, amount }: { customerId: string, paymentMethodId: string, amount: number }) {
    this.calls.push("authorize")
    const payment: PaymentAuthorization = {
      id: `pi_${this.payments.size + 1}`,
      status: this.authorizeStatus,
      amount,
      customerId,
      paymentMethodId,
      clientSecret: "pi_secret",
    }
    this.payments.set(payment.id, payment)
    return payment
  }
  async retrieve(paymentIntentId: string) {
    const payment = this.payments.get(paymentIntentId)
    if (!payment) throw new Error("No such payment")
    return payment
  }
  async capture(paymentIntentId: string) {
    this.calls.push(`capture:${paymentIntentId}`)
    if (this.captureFails) throw new Error("capture failed")
  }
  async cancel(paymentIntentId: string) {
    this.calls.push(`cancel:${paymentIntentId}`)
  }
  async refund(paymentIntentId: string, idempotencyKey: string) {
    this.calls.push(`refund:${paymentIntentId}`)
    if (this.refundFails) throw new Error("refund failed")
    this.refunds.push({ paymentIntentId, idempotencyKey })
  }
}
