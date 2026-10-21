import { prisma } from "@/lib/prisma"
import { IOrderItemRepository } from "../interfaces/IOrderItemRepository"

export class OrderItemRepository implements IOrderItemRepository {
  async findManyByOrderId(orderId: number) {
    return await prisma.orderItem.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
    })
  }
}