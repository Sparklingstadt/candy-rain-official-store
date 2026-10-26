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
  // Newest first. paymentStatus and limit are optional narrowing for the dashboard.
  findManyForAdmin(filter: { shippingStatus: ShippingStatus | null, paymentStatus?: string, limit?: number }): Promise<AdminOrderSummary[]>
  findByIdForAdmin(orderId: number): Promise<AdminOrderDetail | null>
  countByShippingStatus(): Promise<Partial<Record<string, number>>>
  countByPaymentStatus(paymentStatus: string): Promise<number>
  // Orders placed at or after `since`, excluding cancelled ones; totalPrice includes shipping.
  summarizeSales(since: Date): Promise<{ orderCount: number, totalPrice: number }>
}
