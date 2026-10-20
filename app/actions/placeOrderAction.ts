"use server"
import { requireUserId } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { CheckoutError, createOrderFromCart } from "@/services/checkout/checkoutService"
import { revalidatePath } from "next/cache"

export async function placeOrderAction(): Promise<ActionResult<{ orderId: number }>> {
  const userId = await requireUserId()

  let orderId: number
  try {
    orderId = (await createOrderFromCart(userId)).id
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, message: error.message }
    }
    throw error
  }

  revalidatePath("/", "layout")
  return { success: true, orderId }
}
