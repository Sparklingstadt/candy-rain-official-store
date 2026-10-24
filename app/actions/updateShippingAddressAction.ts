"use server"
import { requireUserId } from "@/lib/auth"
import { parseShippingAddressInput, type ShippingAddressField } from "@/lib/accountValidation"
import type { FormActionState } from "@/lib/types"
import { UserRepository } from "@/repositories/implementations/userRepository"
import { updateShippingAddress } from "@/services/accountService"
import { revalidatePath } from "next/cache"

export async function updateShippingAddressAction(_prevState: unknown, formData: FormData): Promise<FormActionState<ShippingAddressField>> {
  const userId = await requireUserId()
  const result = parseShippingAddressInput(formData)
  if (!result.success) {
    return { ...result, message: "入力内容を確認してください" }
  }

  await updateShippingAddress(new UserRepository(), userId, result.data)
  revalidatePath("/account", "layout")
  return { success: true }
}
