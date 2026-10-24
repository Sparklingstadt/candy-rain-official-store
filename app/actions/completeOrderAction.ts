"use server"
import { requireUserId } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireStripeId } from "@/lib/validation"
import { CheckoutError, completePaidCheckout } from "@/services/checkout/checkoutService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"
import { revalidatePath } from "next/cache"

// Called after the browser finished 3D Secure for a payment started by placeOrderAction.
export async function completeOrderAction({ paymentIntentId }: {
  paymentIntentId: unknown
}): Promise<ActionResult<{ orderId: number }>> {
  const userId = await requireUserId()
  const validatedPaymentIntentId = requireStripeId(paymentIntentId, "pi", "paymentIntentId")

  let orderId: number
  try {
    orderId = await completePaidCheckout(new StripePaymentGateway(), userId, validatedPaymentIntentId)
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, message: error.message }
    }
    throw error
  }

  revalidatePath("/", "layout")
  return { success: true, orderId }
}
