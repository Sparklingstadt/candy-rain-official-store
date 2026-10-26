import { prisma } from "@/lib/prisma"
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
}