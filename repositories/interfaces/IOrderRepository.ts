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

export type SalesSummary = {
  orderCount: number
  // All non-cancelled orders, including unpaid and payment/refund errors.
  totalPrice: number
  paidOrderCount: number
  paidTotalPrice: number
}

export interface IOrderRepository {
  findManyByUserId(userId: number, limit?: number): Promise<Order[]>
  findByOrderIdForUser(orderId: number, userId: number): Promise<Order | null>
  // Newest first. paymentStatus and limit are optional narrowing for the dashboard.
  findManyForAdmin(filter: { shippingStatus: ShippingStatus | null, paymentStatus?: string, limit?: number }): Promise<AdminOrderSummary[]>
  findByIdForAdmin(orderId: number): Promise<AdminOrderDetail | null>
  countByShippingStatus(): Promise<Partial<Record<string, number>>>
  countByPaymentStatus(paymentStatus: string): Promise<number>
  // Order-date cohort at or after `since`, excluding cancelled orders; amounts include shipping.
  // Paid figures include only PAID_PAYMENT_STATUS, not refund errors or refunded orders.
  summarizeSales(since: Date): Promise<SalesSummary>
}
