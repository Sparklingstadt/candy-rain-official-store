import type { SalesType } from "@/lib/salesTypes";
import { Product, ProductWithVariant } from "../entities/Product";

export interface IProductRepository {
  findById(productId: number): Promise<Product | null>
  findManyWithVariants(salesType?: SalesType | null): Promise<ProductWithVariant[]>
}