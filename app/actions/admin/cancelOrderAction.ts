"use server"
import { requireAdmin } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireConfirmation, requireNonNegativeInteger } from "@/lib/validation"
import { OrderAdminError, cancelOrder } from "@/services/admin/orderAdminService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"
import { revalidatePath } from "next/cache"

export async function cancelOrderAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let orderId
  try {
    orderId = requireNonNegativeInteger(formData.get("orderId"), "orderId")
  } catch {
    return { success: false, message: "入力内容を確認してください" }
  }

  try {
    requireConfirmation(formData.get("confirm"))
  } catch {
    return { success: false, message: "キャンセルの確認にチェックしてください" }
  }

  let refund
  try {
    ({ refund } = await cancelOrder(() => new StripePaymentGateway(), orderId))
  } catch (error) {
    if (error instanceof OrderAdminError) return { success: false, message: error.message }
    console.error(error)
    return { success: false, message: "処理に失敗しました。時間をおいてもう一度お試しください" }
  }

  revalidatePath("/admin/orders", "layout")
  revalidatePath("/orders", "layout")
  if (refund === "failed") return { success: true, message: "キャンセルしましたが返金に失敗しました。再試行してください" }
  return { success: true, message: "注文をキャンセルしました" }
}
