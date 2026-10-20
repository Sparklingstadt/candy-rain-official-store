import { prisma } from "@/lib/prisma";
import { calculateOrderTotal, SHIPPING_PRICE } from "./orderPricing";
import { INITIAL_PAYMENT_STATUS, INITIAL_SHIPPING_STATUS } from "./orderStatus";

export type CheckoutErrorCode = "EMPTY_CART" | "INSUFFICIENT_STOCK"

export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CheckoutError"
  }
}

export async function createOrderFromCart(userId: number) {
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
      throw new CheckoutError("EMPTY_CART", "カートが空です")
    }

    for (const item of cart.items) {
      const stockUpdate = await tx.variant.updateMany({
        where: {
          id: item.variantId,
          stock: { gte: item.quantity }
        },
        data: {
          stock: { decrement: item.quantity }
        }
      })

      if (stockUpdate.count !== 1) {
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
        totalPrice: calculateOrderTotal(cart.items, SHIPPING_PRICE),
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
