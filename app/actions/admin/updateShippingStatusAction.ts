"use server"
import { requireAdmin } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireNonNegativeInteger, requireShippingStatus } from "@/lib/validation"
import { OrderAdminError, updateShippingStatus } from "@/services/admin/orderAdminService"
import { revalidatePath } from "next/cache"

export async function updateShippingStatusAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let input
  try {
    input = {
      orderId: requireNonNegativeInteger(formData.get("orderId"), "orderId"),
      currentStatus: requireShippingStatus(formData.get("currentStatus"), "currentStatus"),
      nextStatus: requireShippingStatus(formData.get("nextStatus"), "nextStatus"),
    }
  } catch {
    return { success: false, message: "入力内容を確認してください" }
  }

  try {
    await updateShippingStatus(input.orderId, input.currentStatus, input.nextStatus)
  } catch (error) {
    if (error instanceof OrderAdminError) {
      // Refresh so the page shows the current state the error refers to (e.g. after a stale status).
      revalidatePath("/admin/orders", "layout")
      revalidatePath("/orders", "layout")
      return { success: false, message: error.message }
    }
    console.error(error)
    return { success: false, message: "処理に失敗しました。時間をおいてもう一度お試しください" }
  }

  revalidatePath("/admin/orders", "layout")
  revalidatePath("/orders", "layout")
  return { success: true, message: `発送ステータスを「${input.nextStatus}」に変更しました` }
}
