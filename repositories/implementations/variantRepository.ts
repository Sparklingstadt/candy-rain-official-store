import { prisma } from "@/lib/prisma"
import { IVariantRepository } from "../interfaces/IVariantRepository"

export class VariantRepository implements IVariantRepository {
  async findManyByProductId(productId: number) {
    return await prisma.variant.findMany({ where: { productId }, orderBy: { id: "asc" } })
  }

  // One conditional UPDATE, like the purchase decrement, so concurrent changes are neither lost nor take the stock below zero.
  // For an increase the condition stock >= -delta is always true. The read stays in the transaction so it cannot see a later update.
  async adjustStock(variantId: number, delta: number) {
    return await prisma.$transaction(async tx => {
      const updated = await tx.variant.updateMany({
        where: { id: variantId, stock: { gte: -delta } },
        data: { stock: { increment: delta } },
      })
      if (updated.count !== 1) return null
      const variant = await tx.variant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } })
      return variant.stock
    })
  }

  async updatePrice(variantId: number, currentPrice: number, nextPrice: number) {
    const updated = await prisma.variant.updateMany({
      where: { id: variantId, price: currentPrice },
      data: { price: nextPrice },
    })
    return updated.count === 1
  }

  async findStockAndPrice(variantId: number) {
    return await prisma.variant.findUnique({ where: { id: variantId }, select: { stock: true, price: true } })
  }
}
