import type { ProductInput } from "@/lib/productValidation";
import type { SalesType } from "@/lib/salesTypes";
import { Product, ProductForAdmin, ProductWithVariant } from "../entities/Product";

export interface IProductRepository {
  // Store reads return only products that are published and have a published variant.
  findById(productId: number): Promise<Product | null>
  findManyWithVariants(salesType?: SalesType | null): Promise<ProductWithVariant[]>
  // Admin reads return every product and variant.
  findManyForAdmin(): Promise<ProductForAdmin[]>
  findByIdForAdmin(productId: number): Promise<ProductForAdmin | null>
  count(): Promise<number>
  // Creates a hidden product, or returns null when `limit` products already exist.
  createWithinLimit(input: ProductInput, limit: number): Promise<{ id: number } | null>
  update(productId: number, input: ProductInput): Promise<boolean>
  setPublished(productId: number, published: boolean): Promise<boolean>
}
