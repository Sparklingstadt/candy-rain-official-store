import { prisma } from "@/lib/prisma"
import { canChangeShippingStatus, type ShippingStatus } from "./shippingStatusTransition"

export type OrderAdminErrorCode =
  | "ORDER_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "STALE_STATUS"
  | "NOT_CANCELLABLE"
  | "REFUND_NOT_RETRYABLE"

export class OrderAdminError extends Error {
  constructor(
    public readonly code: OrderAdminErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "OrderAdminError"
  }
}

// The update is conditional on the status the admin saw, so a concurrent change is reported instead of overwritten.
export async function updateShippingStatus(orderId: number, currentStatus: ShippingStatus, nextStatus: ShippingStatus) {
  if (!canChangeShippingStatus(currentStatus, nextStatus)) {
    throw new OrderAdminError("INVALID_TRANSITION", "この発送ステータスには変更できません")
  }

  const updated = await prisma.order.updateMany({
    where: { id: orderId, shippingStatus: currentStatus },
    data: { shippingStatus: nextStatus },
  })
  if (updated.count === 1) return

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) throw new OrderAdminError("ORDER_NOT_FOUND", "注文が見つかりません")
  throw new OrderAdminError("STALE_STATUS", "注文が別の操作で更新されています。最新の状態を確認してください")
}
