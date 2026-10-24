"use server"
import { requireUserId } from "@/lib/auth"
import { isStripeEnabled } from "@/lib/stripe"
import type { ActionResult } from "@/lib/types"
import { requireStripeId } from "@/lib/validation"
import { CheckoutError, createOrderFromCart, startPaidCheckout } from "@/services/checkout/checkoutService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"
import { revalidatePath } from "next/cache"

export type PlaceOrderResult = ActionResult<
  | { orderId: number }
  | { paymentIntentId: string, clientSecret: string }
>

export async function placeOrderAction(input?: { paymentMethodId?: unknown }): Promise<PlaceOrderResult> {
  const userId = await requireUserId()

  try {
    if (!isStripeEnabled()) {
      const orderId = (await createOrderFromCart(userId)).id
      revalidatePath("/", "layout")
      return { success: true, orderId }
    }

    const paymentMethodId = requireStripeId(input?.paymentMethodId, "pm", "paymentMethodId")
    const result = await startPaidCheckout(new StripePaymentGateway(), userId, paymentMethodId)
    if (result.status === "requires_action") {
      return { success: true, paymentIntentId: result.paymentIntentId, clientSecret: result.clientSecret }
    }
    revalidatePath("/", "layout")
    return { success: true, orderId: result.orderId }
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, message: error.message }
    }
    throw error
  }
}
