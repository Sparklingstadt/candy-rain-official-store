"use server"
import { requireUserId } from "@/lib/auth"
import { parseProfileInput, type ProfileField } from "@/lib/accountValidation"
import type { FormActionState } from "@/lib/types"
import { UserRepository } from "@/repositories/implementations/userRepository"
import { updateProfile } from "@/services/accountService"
import { revalidatePath } from "next/cache"

export async function updateProfileAction(_prevState: unknown, formData: FormData): Promise<FormActionState<ProfileField>> {
  const userId = await requireUserId()
  const result = parseProfileInput(formData)
  if (!result.success) {
    return { ...result, message: "入力内容を確認してください" }
  }

  await updateProfile(new UserRepository(), userId, result.data)
  revalidatePath("/account", "layout")
  return { success: true }
}
