import { prisma } from "@/lib/prisma"
import type { VariantInput, VariantUpdateInput } from "@/lib/productValidation"
import { IVariantRepository } from "../interfaces/IVariantRepository"

export class VariantRepository implements IVariantRepository {
  async findManyByProductId(productId: number) {
    return await prisma.variant.findMany({ where: { productId, isPublished: true }, orderBy: { id: "asc" } })
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

  async findByIdForAdmin(productId: number, variantId: number) {
    return await prisma.variant.findFirst({ where: { id: variantId, productId } })
  }

  async countByProductId(productId: number) {
    return await prisma.variant.count({ where: { productId } })
  }

  async createWithinLimit(productId: number, input: VariantInput, limit: number) {
    return await prisma.$transaction(async tx => {
      if (await tx.variant.count({ where: { productId } }) >= limit) return null
      return await tx.variant.create({ data: { ...input, productId, isPublished: false }, select: { id: true } })
    })
  }

  // Filtering on productId too keeps a URL for one product from changing another product's variant.
  async update(productId: number, variantId: number, input: VariantUpdateInput) {
    const updated = await prisma.variant.updateMany({ where: { id: variantId, productId }, data: input })
    return updated.count === 1
  }

  async setPublished(productId: number, variantId: number, published: boolean) {
    const updated = await prisma.variant.updateMany({ where: { id: variantId, productId }, data: { isPublished: published } })
    return updated.count === 1
  }
}
