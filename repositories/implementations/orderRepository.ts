import { prisma } from "@/lib/prisma"
import { IOrderRepository } from "../interfaces/IOrderRepository"
import { Order } from "../entities/Order"

export class OrderRepository implements IOrderRepository {
  async findManyByUserId(userId: number, limit?: number) {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: [{ orderedAt: "desc" }, { id: "desc" }],
      take: limit,
    })
    return orders.map(order => {
      return new Order(
        order.id,
        order.paymentStatus,
        order.shippingStatus,
        order.shippingPrice,
        order.totalPrice,
        order.orderedAt,
        order.userId
      )
    })
  }
  async findByOrderIdForUser(orderId: number, userId: number) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId }
    })
    if (!order) return null

    return new Order(
      order.id,
      order.paymentStatus,
      order.shippingStatus,
      order.shippingPrice,
      order.totalPrice,
      order.orderedAt,
      order.userId
    )
  }
}
