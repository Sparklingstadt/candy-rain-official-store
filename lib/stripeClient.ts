import { loadStripe, type Stripe } from "@stripe/stripe-js"

let stripePromise: Promise<Stripe | null> | null = null

// Stripe.js is loaded once, on the first page that collects or authenticates a card.
export function getStripeClient() {
  stripePromise ??= loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "")
  return stripePromise
}
