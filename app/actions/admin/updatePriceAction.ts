"use server"
import { requireAdmin } from "@/lib/auth"
import { formatPrice } from "@/lib/format"
import type { ActionResult } from "@/lib/types"
import { requireNonNegativeInteger, requirePrice } from "@/lib/validation"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { InventoryAdminError, updatePrice } from "@/services/admin/inventoryAdminService"
import { revalidatePath } from "next/cache"

function revalidateInventory() {
  revalidatePath("/admin/inventory")
  revalidatePath("/", "layout")
}

export async function updatePriceAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let input
  try {
    input = {
      variantId: requireNonNegativeInteger(formData.get("variantId"), "variantId"),
      currentPrice: requirePrice(formData.get("currentPrice")),
      nextPrice: requirePrice(formData.get("nextPrice")),
    }
  } catch {
    return { success: false, message: "入力内容を確認してください" }
  }

  try {
    await updatePrice(new VariantRepository(), input.variantId, input.currentPrice, input.nextPrice)
  } catch (error) {
    if (error instanceof InventoryAdminError) {
      // Refresh so the page shows the current price the error refers to.
      revalidateInventory()
      return { success: false, message: error.message }
    }
    console.error(error)
    return { success: false, message: "処理に失敗しました。時間をおいてもう一度お試しください" }
  }

  revalidateInventory()
  return { success: true, message: `価格を ${formatPrice(input.nextPrice)} に更新しました` }
}
