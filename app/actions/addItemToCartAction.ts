"use server"
import { addItemToCart, CartError } from "@/services/cartService"
import { requireUserId } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireCartQuantity, requireNonNegativeInteger } from "@/lib/validation"
import { revalidatePath } from "next/cache"

export async function addItemToCartAction(_prevState: unknown, formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId()
  const variantId = requireNonNegativeInteger(formData.get("variantId"), "variantId")
  const quantity = requireCartQuantity(formData.get("quantity"))

  try {
    await addItemToCart({ userId, variantId, quantity })
  } catch (error) {
    if (error instanceof CartError) {
      return { success: false, message: error.message }
    }
    throw error
  }

  revalidatePath("/", "layout")
  return { success: true }
}
