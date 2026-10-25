import { Order } from "../entities/Order";
import type { ShippingStatus } from "@/services/admin/shippingStatusTransition"

export type AdminOrderSummary = {
  id: number
  orderedAt: Date
  totalPrice: number
  paymentStatus: string
  shippingStatus: string
  customerName: string
}

export type AdminOrderDetail = AdminOrderSummary & {
  shippingPrice: number
  paymentMethodLabel: string | null
  hasPayment: boolean
  customerEmail: string
  shippingAddress: { postalCode: string, prefecture: string, addressLine1: string, addressLine2: string | null } | null
}

export interface IOrderRepository {
  findManyByUserId(userId: number, limit?: number): Promise<Order[]>
  findByOrderIdForUser(orderId: number, userId: number): Promise<Order | null>
  findManyForAdmin(filter: { shippingStatus: ShippingStatus | null }): Promise<AdminOrderSummary[]>
  findByIdForAdmin(orderId: number): Promise<AdminOrderDetail | null>
}
