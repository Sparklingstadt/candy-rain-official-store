import { Variant } from "../entities/Variant";

export interface IVariantRepository {
  findManyByProductId(productId: number): Promise<Variant[]>
}
