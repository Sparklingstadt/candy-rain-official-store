import { prisma } from "@/lib/prisma"
import type { ProductInput } from "@/lib/productValidation"
import type { SalesType } from "@/lib/salesTypes"
import { IProductRepository } from "../interfaces/IProductRepository"

// The store lists a product only while it is published and has at least one published variant.
const listedInStore = { isPublished: true, variants: { some: { isPublished: true } } }

export class ProductRepository implements IProductRepository {
  async findById(productId: number) {
    return await prisma.product.findFirst({
      where: { id: productId, ...listedInStore }
    })
  }
  async findManyWithVariants(salesType?: SalesType | null) {
    return await prisma.product.findMany({
      where: salesType ? { ...listedInStore, salesType } : listedInStore,
      include: { variants: { where: { isPublished: true }, orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    })
  }

  async findManyForAdmin() {
    return await prisma.product.findMany({
      include: { variants: { orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    })
  }

  async findByIdForAdmin(productId: number) {
    return await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { orderBy: { id: "asc" } } },
    })
  }

  // Counting and creating share a transaction; a concurrent create may still pass the limit by one, which is acceptable for the demo.
  async createWithinLimit(input: ProductInput, limit: number) {
    return await prisma.$transaction(async tx => {
      if (await tx.product.count() >= limit) return null
      return await tx.product.create({ data: { ...input, isPublished: false }, select: { id: true } })
    })
  }

  async update(productId: number, input: ProductInput) {
    const updated = await prisma.product.updateMany({ where: { id: productId }, data: input })
    return updated.count === 1
  }

  async setPublished(productId: number, published: boolean) {
    const updated = await prisma.product.updateMany({ where: { id: productId }, data: { isPublished: published } })
    return updated.count === 1
  }
}
