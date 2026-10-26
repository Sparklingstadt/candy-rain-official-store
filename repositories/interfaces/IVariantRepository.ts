import type { VariantInput, VariantUpdateInput } from "@/lib/productValidation";
import type { VariantForAdmin } from "../entities/Product";
import { Variant } from "../entities/Variant";

export interface IVariantRepository {
  // Published variants only, for the store.
  findManyByProductId(productId: number): Promise<Variant[]>
  // The variant only when it belongs to productId.
  findByIdForAdmin(productId: number, variantId: number): Promise<VariantForAdmin | null>
  countByProductId(productId: number): Promise<number>
  // Creates a hidden variant, or returns null when the product already has `limit` variants.
  createWithinLimit(productId: number, input: VariantInput, limit: number): Promise<{ id: number } | null>
  // The next two update only a variant of productId and return whether a row was updated.
  update(productId: number, variantId: number, input: VariantUpdateInput): Promise<boolean>
  setPublished(productId: number, variantId: number, published: boolean): Promise<boolean>
  // Returns the stock after the change, or null when the variant is missing or a decrease would take the stock below zero.
  adjustStock(variantId: number, delta: number): Promise<number | null>
  // Updates only while the price still equals currentPrice; returns whether a row was updated.
  updatePrice(variantId: number, currentPrice: number, nextPrice: number): Promise<boolean>
  findStockAndPrice(variantId: number): Promise<{ stock: number, price: number } | null>
}
