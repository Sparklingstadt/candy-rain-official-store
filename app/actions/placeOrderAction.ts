"use server"

import { requireUserId } from "@/lib/auth"
import checkoutService, { CheckoutError } from "@/services/checkout/checkoutService"

export type PlaceOrderResult =
  | { success: true; orderId: number }
  | { success: false; message: string }

export async function placeOrderAction(): Promise<PlaceOrderResult> {
  const userId = await requireUserId()
  try {
    const order = await checkoutService(userId)
    return { success: true, orderId: order.id }
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, message: error.message }
    }
    throw error
  }
}
