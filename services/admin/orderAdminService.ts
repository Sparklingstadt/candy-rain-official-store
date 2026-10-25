import { prisma } from "@/lib/prisma"
import {
  CANCELLED_SHIPPING_STATUS,
  INITIAL_SHIPPING_STATUS,
  PREPARING_SHIPPING_STATUS,
  REFUND_ERROR_PAYMENT_STATUS,
  REFUNDED_PAYMENT_STATUS,
} from "@/services/checkout/orderStatus"
import type { PaymentGateway } from "@/services/payment/paymentGateway"
import { canChangeShippingStatus, canRetryRefund, type ShippingStatus } from "./shippingStatusTransition"

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

export type RefundOutcome = "none" | "refunded" | "failed"

// Returns the Stripe payment to the customer and records the outcome. The idempotency key makes repeating it safe.
// It is derived from the PaymentIntent, which is unique per Stripe account, so environments sharing one test account cannot collide on order ids.
// The gateway is created lazily so orders without a payment can be cancelled even when Stripe is not configured.
async function settleRefund(getGateway: () => PaymentGateway, order: { id: number, paymentIntentId: string }): Promise<"refunded" | "failed"> {
  try {
    await getGateway().refund(order.paymentIntentId, `refund-${order.paymentIntentId}`)
  } catch (error) {
    console.error("Failed to refund order", order.id, order.paymentIntentId, error)
    // A concurrent retry may have refunded in the meantime; never turn a finished refund back into an error.
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: REFUNDED_PAYMENT_STATUS } },
      data: { paymentStatus: REFUND_ERROR_PAYMENT_STATUS },
    })
    return "failed"
  }
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: REFUNDED_PAYMENT_STATUS } })
  return "refunded"
}

// The database is settled first because the refund is an external call that a transaction cannot undo.
// A failed refund leaves the cancellation in place and is recorded as a payment status so it can be retried.
export async function cancelOrder(getGateway: () => PaymentGateway, orderId: number): Promise<{ refund: RefundOutcome }> {
  const paymentIntentId = await prisma.$transaction(async tx => {
    // The conditional update locks the row, so concurrent cancellations wait and then match nothing.
    const updated = await tx.order.updateMany({
      where: { id: orderId, shippingStatus: { in: [INITIAL_SHIPPING_STATUS, PREPARING_SHIPPING_STATUS] } },
      data: { shippingStatus: CANCELLED_SHIPPING_STATUS },
    })
    if (updated.count === 0) {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true } })
      if (!order) throw new OrderAdminError("ORDER_NOT_FOUND", "注文が見つかりません")
      throw new OrderAdminError("NOT_CANCELLABLE", "この注文はキャンセルできません（発送済み・キャンセル済み、または別の操作で更新済みです）")
    }

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { paymentIntentId: true, orderItems: { select: { variantId: true, quantity: true } } },
    })
    // Variants are updated in id order so two cancellations sharing variants cannot deadlock.
    const restored = new Map<number, number>()
    for (const item of order.orderItems) restored.set(item.variantId, (restored.get(item.variantId) ?? 0) + item.quantity)
    for (const [variantId, quantity] of [...restored].sort(([a], [b]) => a - b)) {
      await tx.variant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } })
    }
    return order.paymentIntentId
  })

  if (!paymentIntentId) return { refund: "none" }
  return { refund: await settleRefund(getGateway, { id: orderId, paymentIntentId }) }
}

export async function retryRefund(getGateway: () => PaymentGateway, orderId: number): Promise<{ refund: "refunded" | "failed" }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, shippingStatus: true, paymentStatus: true, paymentIntentId: true },
  })
  if (!order) throw new OrderAdminError("ORDER_NOT_FOUND", "注文が見つかりません")
  if (!order.paymentIntentId || !canRetryRefund(order.shippingStatus, order.paymentStatus, order.paymentIntentId !== null)) {
    throw new OrderAdminError("REFUND_NOT_RETRYABLE", "この注文は返金を再試行できません")
  }
  return { refund: await settleRefund(getGateway, { id: order.id, paymentIntentId: order.paymentIntentId }) }
}
