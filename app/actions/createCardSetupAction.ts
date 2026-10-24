"use server"
import { requireUserId } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { UserRepository } from "@/repositories/implementations/userRepository"
import { startCardSetup } from "@/services/payment/paymentMethodService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"

export async function createCardSetupAction(): Promise<ActionResult<{ clientSecret: string }>> {
  const userId = await requireUserId()
  const { clientSecret } = await startCardSetup(new StripePaymentGateway(), new UserRepository(), userId)
  return { success: true, clientSecret }
}
