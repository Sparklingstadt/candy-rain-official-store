import "server-only"
import type { IOrderRepository } from "@/repositories/interfaces/IOrderRepository"
import type { ShippingStatus } from "./shippingStatusTransition"

export const getOrdersForAdmin = (repo: IOrderRepository, shippingStatus: ShippingStatus | null) =>
  repo.findManyForAdmin({ shippingStatus })
export const getOrderForAdmin = (repo: IOrderRepository, orderId: number) => repo.findByIdForAdmin(orderId)
