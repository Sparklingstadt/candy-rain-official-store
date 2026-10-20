"use server"
import { CartError, updateCartItemQuantity } from "@/services/cartService"
import { requireUserId } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireCartMutationType, requireNonNegativeInteger } from "@/lib/validation"
import { revalidatePath } from "next/cache"

export async function updateCartItemQuantityAction(_prevState: unknown, formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId()
  const cartItemId = requireNonNegativeInteger(formData.get("cartItemId"), "cartItemId")
  const type = requireCartMutationType(formData.get("type"))

  try {
    await updateCartItemQuantity(userId, cartItemId, type)
  } catch (error) {
    if (error instanceof CartError) {
      return { success: false, message: error.message }
    }
    throw error
  }

  revalidatePath("/", "layout")
  return { success: true }
}
