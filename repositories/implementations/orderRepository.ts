import { prisma } from "@/lib/prisma"
import { IOrderRepository, type AdminOrderDetail, type AdminOrderSummary } from "../interfaces/IOrderRepository"
import type { ShippingStatus } from "@/services/admin/shippingStatusTransition"
import { Order } from "../entities/Order"
import { CANCELLED_SHIPPING_STATUS } from "@/services/checkout/orderStatus"

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
      order.userId,
      order.paymentMethodLabel
    )
  }
  async findManyForAdmin(filter: { shippingStatus: ShippingStatus | null, paymentStatus?: string, limit?: number }): Promise<AdminOrderSummary[]> {
    const orders = await prisma.order.findMany({
      where: {
        ...(filter.shippingStatus ? { shippingStatus: filter.shippingStatus } : {}),
        ...(filter.paymentStatus ? { paymentStatus: filter.paymentStatus } : {}),
      },
      orderBy: [{ orderedAt: "desc" }, { id: "desc" }],
      take: filter.limit,
      include: { user: { select: { firstName: true, lastName: true } } },
    })
    return orders.map(order => ({
      id: order.id,
      orderedAt: order.orderedAt,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      customerName: `${order.user.lastName} ${order.user.firstName}`,
    }))
  }
  async findByIdForAdmin(orderId: number): Promise<AdminOrderDetail | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, postalCode: true, prefecture: true, addressLine1: true, addressLine2: true } },
      },
    })
    if (!order) return null

    const { user } = order
    return {
      id: order.id,
      orderedAt: order.orderedAt,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      customerName: `${user.lastName} ${user.firstName}`,
      shippingPrice: order.shippingPrice,
      paymentMethodLabel: order.paymentMethodLabel,
      hasPayment: order.paymentIntentId !== null,
      customerEmail: user.email,
      shippingAddress: user.postalCode && user.prefecture && user.addressLine1
        ? { postalCode: user.postalCode, prefecture: user.prefecture, addressLine1: user.addressLine1, addressLine2: user.addressLine2 }
        : null,
    }
  }

  async countByShippingStatus() {
    const groups = await prisma.order.groupBy({ by: ["shippingStatus"], _count: { _all: true } })
    return Object.fromEntries(groups.map(group => [group.shippingStatus, group._count._all]))
  }

  async countByPaymentStatus(paymentStatus: string) {
    return await prisma.order.count({ where: { paymentStatus } })
  }

  async summarizeSales(since: Date) {
    const result = await prisma.order.aggregate({
      where: { orderedAt: { gte: since }, shippingStatus: { not: CANCELLED_SHIPPING_STATUS } },
      _count: { _all: true },
      _sum: { totalPrice: true },
    })
    return { orderCount: result._count._all, totalPrice: result._sum.totalPrice ?? 0 }
  }
}
