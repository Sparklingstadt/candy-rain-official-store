import { prisma } from "@/lib/prisma"
import type { SalesType } from "@/lib/salesTypes"
import { IProductRepository } from "../interfaces/IProductRepository"

export class ProductRepository implements IProductRepository {
  async findById(productId: number) {
    return await prisma.product.findUnique({
      where: { id: productId }
    })
  }
  async findManyWithVariants(salesType?: SalesType | null) {
    return await prisma.product.findMany({
      where: salesType ? { salesType } : undefined,
      include: { variants: { orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    })
  }
}