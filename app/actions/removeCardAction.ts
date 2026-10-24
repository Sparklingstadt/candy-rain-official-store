"use server"
import { requireUserId } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireStripeId } from "@/lib/validation"
import { UserRepository } from "@/repositories/implementations/userRepository"
import { removeSavedCard } from "@/services/payment/paymentMethodService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"
import { revalidatePath } from "next/cache"

export async function removeCardAction({ paymentMethodId }: {
  paymentMethodId: unknown
}): Promise<ActionResult> {
  const userId = await requireUserId()
  const validatedPaymentMethodId = requireStripeId(paymentMethodId, "pm", "paymentMethodId")
  await removeSavedCard(new StripePaymentGateway(), new UserRepository(), userId, validatedPaymentMethodId)
  revalidatePath("/", "layout")
  return { success: true }
}
