import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { formatCardLabel } from "@/lib/cards";
import { isOnSale } from "@/lib/availability";
import type { PaymentGateway } from "@/services/payment/paymentGateway";
import { calculateOrderTotal, SHIPPING_PRICE } from "./orderPricing";
import { INITIAL_PAYMENT_STATUS, INITIAL_SHIPPING_STATUS, PAID_PAYMENT_STATUS, PAYMENT_ERROR_STATUS } from "./orderStatus";

export type CheckoutErrorCode =
  | "EMPTY_CART"
  | "INSUFFICIENT_STOCK"
  | "UNAVAILABLE"
  | "CART_CHANGED"
  | "PAYMENT_METHOD_NOT_FOUND"
  | "PAYMENT_DECLINED"

export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CheckoutError"
  }
}

type OrderPayment = {
  paymentIntentId: string
  amount: number
  paymentMethodLabel: string | null
}

const emptyCartError = () => new CheckoutError("EMPTY_CART", "カートが空です")
const unavailableError = (variantName: string) =>
  new CheckoutError("UNAVAILABLE", `販売を停止した商品がカートに含まれています: ${variantName}`)
const withProductPublished = { product: { select: { isPublished: true } } } as const

export async function createOrderFromCart(userId: number, payment?: OrderPayment) {
  return prisma.$transaction(async tx => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { variant: true }
        }
      }
    })

    if(!cart || cart.items.length === 0) {
      throw emptyCartError()
    }

    const totalPrice = calculateOrderTotal(cart.items, SHIPPING_PRICE)
    // The held amount was calculated before payment; the cart may have changed since.
    if (payment && payment.amount !== totalPrice) {
      throw new CheckoutError("CART_CHANGED", "お支払いの途中でカートの内容が変わりました。内容を確認してもう一度お試しください")
    }

    for (const item of cart.items) {
      // Publication is part of the same conditional update, so a product hidden concurrently is never sold.
      const stockUpdate = await tx.variant.updateMany({
        where: {
          id: item.variantId,
          isPublished: true,
          product: { isPublished: true },
          stock: { gte: item.quantity }
        },
        data: {
          stock: { decrement: item.quantity }
        }
      })

      if (stockUpdate.count !== 1) {
        const current = await tx.variant.findUnique({ where: { id: item.variantId }, include: withProductPublished })
        if (!current || !isOnSale(current)) throw unavailableError(item.variant.name)
        throw new CheckoutError(
          "INSUFFICIENT_STOCK",
          `在庫が不足しています: ${item.variant.name}`,
        )
      }
    }

    const order = await tx.order.create({
      data: {
        userId,
        paymentStatus: INITIAL_PAYMENT_STATUS,
        shippingStatus: INITIAL_SHIPPING_STATUS,
        shippingPrice: SHIPPING_PRICE,
        totalPrice,
        paymentIntentId: payment?.paymentIntentId,
        paymentMethodLabel: payment?.paymentMethodLabel,
        orderItems: {
          create: cart.items.map(item => ({
            variant: {
              connect: { id: item.variantId }
            },
            quantity: item.quantity,
            variantName: item.variant.name,
            priceAtPurchase: item.variant.price
          }))
        }
      }
    })

    await tx.cartItem.deleteMany({
      where: { cartId: cart.id }
    })

    return order
  })
}

export type PaidCheckoutResult =
  | { status: "completed", orderId: number }
  | { status: "requires_action", paymentIntentId: string, clientSecret: string }

async function findStripeCustomerId(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } })
  return user?.stripeCustomerId ?? null
}

async function findOrderIdByPayment(userId: number, paymentIntentId: string) {
  const order = await prisma.order.findFirst({ where: { userId, paymentIntentId }, select: { id: true } })
  return order?.id ?? null
}

async function calculateCartTotal(userId: number) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { variant: { include: withProductPublished } } } },
  })
  if (!cart || cart.items.length === 0) throw emptyCartError()
  // Checked before authorizing so a hidden product never puts a hold on the card.
  const unavailable = cart.items.find(item => !isOnSale(item.variant))
  if (unavailable) throw unavailableError(unavailable.variant.name)
  return calculateOrderTotal(cart.items, SHIPPING_PRICE)
}

// Holds the cart total on the saved card. When the card needs 3D Secure, the client
// finishes authentication and then calls completePaidCheckout.
export async function startPaidCheckout(gateway: PaymentGateway, userId: number, paymentMethodId: string): Promise<PaidCheckoutResult> {
  const customerId = await findStripeCustomerId(userId)
  const card = customerId ? await gateway.findCard(customerId, paymentMethodId) : null
  if (!customerId || !card) {
    throw new CheckoutError("PAYMENT_METHOD_NOT_FOUND", "選択したカードが見つかりません。お支払い方法を選び直してください")
  }

  const amount = await calculateCartTotal(userId)
  const authorization = await gateway.authorize({ customerId, paymentMethodId, amount, userId })
  if (authorization.status === "failed") {
    throw new CheckoutError("PAYMENT_DECLINED", "カードが承認されませんでした。別のカードをお試しください")
  }
  if (authorization.status === "requires_action") {
    if (!authorization.clientSecret) throw new Error("PaymentIntent has no client secret")
    return { status: "requires_action", paymentIntentId: authorization.id, clientSecret: authorization.clientSecret }
  }
  return { status: "completed", orderId: await completePaidCheckout(gateway, userId, authorization.id) }
}

// Saves the order for an authorized payment, then captures it. Repeated calls for the
// same payment return the order that was already saved.
export async function completePaidCheckout(gateway: PaymentGateway, userId: number, paymentIntentId: string) {
  const existingOrderId = await findOrderIdByPayment(userId, paymentIntentId)
  if (existingOrderId !== null) return existingOrderId

  const customerId = await findStripeCustomerId(userId)
  const authorization = await gateway.retrieve(paymentIntentId)
  if (!customerId || authorization.customerId !== customerId) throw new Error("Payment not found")
  if (authorization.status !== "authorized") {
    throw new CheckoutError("PAYMENT_DECLINED", "カードの認証が完了しませんでした。もう一度お試しいただくか、別のカードを選んでください")
  }

  const card = authorization.paymentMethodId ? await gateway.findCard(customerId, authorization.paymentMethodId) : null
  let orderId: number
  try {
    orderId = (await createOrderFromCart(userId, {
      paymentIntentId,
      amount: authorization.amount,
      paymentMethodLabel: card && formatCardLabel(card),
    })).id
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentOrderId = await findOrderIdByPayment(userId, paymentIntentId)
      if (concurrentOrderId !== null) return concurrentOrderId
    }
    // No order was saved, so release the hold instead of charging the card.
    await gateway.cancel(paymentIntentId).catch(cancelError => {
      console.error("Failed to cancel payment", paymentIntentId, cancelError)
    })
    throw error
  }

  let paymentStatus = PAID_PAYMENT_STATUS
  try {
    await gateway.capture(paymentIntentId)
  } catch (error) {
    console.error("Failed to capture payment", paymentIntentId, error)
    paymentStatus = PAYMENT_ERROR_STATUS
  }
  // Conditional so a payment status an admin already moved on (e.g. a cancellation refund) is never overwritten.
  await prisma.order.updateMany({ where: { id: orderId, paymentStatus: INITIAL_PAYMENT_STATUS }, data: { paymentStatus } })
  return orderId
}
