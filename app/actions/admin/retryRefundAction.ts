"use server"
import { requireAdmin } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireNonNegativeInteger } from "@/lib/validation"
import { OrderAdminError, retryRefund } from "@/services/admin/orderAdminService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"
import { revalidatePath } from "next/cache"

export async function retryRefundAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let orderId
  try {
    orderId = requireNonNegativeInteger(formData.get("orderId"), "orderId")
  } catch {
    return { success: false, message: "入力内容を確認してください" }
  }

  let refund
  try {
    ({ refund } = await retryRefund(() => new StripePaymentGateway(), orderId))
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
  if (refund === "failed") return { success: false, message: "返金に失敗しました。時間をおいてもう一度お試しください" }
  return { success: true, message: "返金しました" }
}
