import { prisma } from "@/lib/prisma"
import { IVariantRepository } from "../interfaces/IVariantRepository"

export class VariantRepository implements IVariantRepository {
  async findById(variantId: number) {
    return await prisma.variant.findUnique({ where: { id: variantId } })
  }

  async findManyByProductId(productId: number) {
    return await prisma.variant.findMany({ where: { productId }, orderBy: { id: "asc" } })
  }
}
