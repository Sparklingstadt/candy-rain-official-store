import type { IVariantRepository } from "@/repositories/interfaces/IVariantRepository"

export type InventoryAdminErrorCode = "VARIANT_NOT_FOUND" | "INSUFFICIENT_STOCK" | "STALE_PRICE"

export class InventoryAdminError extends Error {
  constructor(
    public readonly code: InventoryAdminErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "InventoryAdminError"
  }
}

const NOT_FOUND_MESSAGE = "バリエーションが見つかりません"

// The change is a single conditional update, so it composes with purchases that decrement stock concurrently.
export async function adjustStock(repo: IVariantRepository, variantId: number, delta: number): Promise<{ stock: number }> {
  const stock = await repo.adjustStock(variantId, delta)
  if (stock !== null) return { stock }

  const current = await repo.findStockAndPrice(variantId)
  if (!current) throw new InventoryAdminError("VARIANT_NOT_FOUND", NOT_FOUND_MESSAGE)
  throw new InventoryAdminError("INSUFFICIENT_STOCK", `在庫が足りないため減らせません（現在の在庫: ${current.stock}）`)
}

// The update is conditional on the price the admin saw, so a concurrent change is reported instead of overwritten.
export async function updatePrice(repo: IVariantRepository, variantId: number, currentPrice: number, nextPrice: number): Promise<void> {
  if (currentPrice === nextPrice) return
  if (await repo.updatePrice(variantId, currentPrice, nextPrice)) return

  const current = await repo.findStockAndPrice(variantId)
  if (!current) throw new InventoryAdminError("VARIANT_NOT_FOUND", NOT_FOUND_MESSAGE)
  throw new InventoryAdminError("STALE_PRICE", "価格が別の操作で更新されています。最新の状態を確認してください")
}
