import { Variant } from "../entities/Variant";

export interface IVariantRepository {
  findManyByProductId(productId: number): Promise<Variant[]>
  // Returns the stock after the change, or null when the variant is missing or a decrease would take the stock below zero.
  adjustStock(variantId: number, delta: number): Promise<number | null>
  // Updates only while the price still equals currentPrice; returns whether a row was updated.
  updatePrice(variantId: number, currentPrice: number, nextPrice: number): Promise<boolean>
  findStockAndPrice(variantId: number): Promise<{ stock: number, price: number } | null>
}
