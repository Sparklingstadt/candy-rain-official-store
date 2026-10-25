import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import type { SavedCard } from "@/lib/cards"
import type { PaymentAuthorization, PaymentGateway } from "./paymentGateway"

function toSavedCard(paymentMethod: Stripe.PaymentMethod): SavedCard | null {
  const card = paymentMethod.card
  if (!card) return null
  return { id: paymentMethod.id, brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year }
}

function idOf(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null
}

function toAuthorization(paymentIntent: Stripe.PaymentIntent): PaymentAuthorization {
  const status = paymentIntent.status === "requires_capture"
    ? "authorized"
    : paymentIntent.status === "requires_action" ? "requires_action" : "failed"
  return {
    id: paymentIntent.id,
    status,
    amount: paymentIntent.amount,
    customerId: idOf(paymentIntent.customer),
    paymentMethodId: idOf(paymentIntent.payment_method),
    clientSecret: paymentIntent.client_secret,
  }
}

export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe = getStripe()

  async createCustomer(userId: number) {
    const customer = await this.stripe.customers.create({ metadata: { userId: String(userId) } })
    return customer.id
  }

  async createCardSetup(customerId: string) {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      allowed_payment_method_types: ["card"],
      usage: "on_session",
    })
    if (!setupIntent.client_secret) throw new Error("SetupIntent has no client secret")
    return { clientSecret: setupIntent.client_secret }
  }

  async listCards(customerId: string) {
    const paymentMethods = await this.stripe.customers.listPaymentMethods(customerId, { type: "card", limit: 20 })
    return paymentMethods.data.flatMap(paymentMethod => toSavedCard(paymentMethod) ?? [])
  }

  async findCard(customerId: string, paymentMethodId: string) {
    try {
      return toSavedCard(await this.stripe.customers.retrievePaymentMethod(customerId, paymentMethodId))
    } catch (error) {
      // Stripe answers 404 for unknown cards and cards owned by another customer.
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) return null
      throw error
    }
  }

  async removeCard(customerId: string, paymentMethodId: string) {
    if (!await this.findCard(customerId, paymentMethodId)) return false
    await this.stripe.paymentMethods.detach(paymentMethodId)
    return true
  }

  async authorize({ customerId, paymentMethodId, amount, userId }: { customerId: string, paymentMethodId: string, amount: number, userId: number }): Promise<PaymentAuthorization> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: "jpy",
        customer: customerId,
        payment_method: paymentMethodId,
        allowed_payment_method_types: ["card"],
        // Hold the amount first; it is captured only after the order is saved.
        capture_method: "manual",
        confirm: true,
        metadata: { userId: String(userId) },
      })
      return toAuthorization(paymentIntent)
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        return {
          id: error.payment_intent?.id ?? "",
          status: "failed",
          amount,
          customerId,
          paymentMethodId,
          clientSecret: null,
        }
      }
      throw error
    }
  }

  async retrieve(paymentIntentId: string) {
    return toAuthorization(await this.stripe.paymentIntents.retrieve(paymentIntentId))
  }

  async capture(paymentIntentId: string) {
    await this.stripe.paymentIntents.capture(paymentIntentId)
  }

  async cancel(paymentIntentId: string) {
    await this.stripe.paymentIntents.cancel(paymentIntentId)
  }

  async refund(paymentIntentId: string, idempotencyKey: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
    switch (paymentIntent.status) {
      case "requires_capture":
        // Only held, never captured: releasing the hold returns the money.
        await this.stripe.paymentIntents.cancel(paymentIntentId)
        return
      case "succeeded":
        try {
          await this.stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey })
        } catch (error) {
          // A refund that already went through counts as done, so a retry after a lost response succeeds.
          if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "charge_already_refunded") return
          throw error
        }
        return
      case "canceled":
        return
      default:
        throw new Error(`Cannot refund PaymentIntent ${paymentIntentId} in status ${paymentIntent.status}`)
    }
  }
}
