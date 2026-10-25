"use server"
import { requireAdmin } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireNonNegativeInteger, requireStockDelta } from "@/lib/validation"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { adjustStock, InventoryAdminError } from "@/services/admin/inventoryAdminService"
import { revalidatePath } from "next/cache"

function revalidateInventory() {
  revalidatePath("/admin/inventory")
  revalidatePath("/", "layout")
}

export async function adjustStockAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let input
  try {
    input = {
      variantId: requireNonNegativeInteger(formData.get("variantId"), "variantId"),
      delta: requireStockDelta(formData.get("delta")),
    }
  } catch {
    return { success: false, message: "入力内容を確認してください" }
  }

  let stock
  try {
    ({ stock } = await adjustStock(new VariantRepository(), input.variantId, input.delta))
  } catch (error) {
    if (error instanceof InventoryAdminError) {
      // Refresh so the page shows the current stock the error refers to.
      revalidateInventory()
      return { success: false, message: error.message }
    }
    console.error(error)
    return { success: false, message: "処理に失敗しました。時間をおいてもう一度お試しください" }
  }

  revalidateInventory()
  return { success: true, message: `在庫を ${stock} に更新しました` }
}
