import Stripe from "stripe"

// Only test-mode keys are accepted so the demo can never create a real charge.
function testModeKey(name: string, prefixes: string[]) {
  const value = process.env[name]
  if (!value) return null
  if (!prefixes.some(prefix => value.startsWith(prefix))) {
    throw new Error(`${name} must be a Stripe test-mode key`)
  }
  return value
}

// Card payments are enabled only when both keys are set; otherwise checkout keeps
// the demo flow that places orders without payment.
export function isStripeEnabled() {
  return Boolean(
    testModeKey("STRIPE_SECRET_KEY", ["sk_test_", "rk_test_"]) &&
    testModeKey("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", ["pk_test_"])
  )
}

let client: Stripe | null = null

export function getStripe() {
  const secretKey = testModeKey("STRIPE_SECRET_KEY", ["sk_test_", "rk_test_"])
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set")
  client ??= new Stripe(secretKey)
  return client
}
