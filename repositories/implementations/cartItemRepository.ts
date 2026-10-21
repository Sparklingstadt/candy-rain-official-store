import { prisma } from "@/lib/prisma"
import { AddToCartResult, ICartItemRepository } from "../interfaces/ICartItemRepository"
import { maxCartQuantityFor } from "@/lib/validation"

export class CartItemRepository implements ICartItemRepository {
  async findManyByCartId(cartId: number) {
    return await prisma.cartItem.findMany({
      where: { cartId }
    })
  }
  async findManyWithVariantsByCartId(cartId: number) {
    return await prisma.cartItem.findMany({
      where: { cartId },
      include: {
        variant: true
      },
      // Keep rows in place while quantities change; updates would otherwise reorder them.
      orderBy: { id: "asc" },
    })
  }
  async addToCart({
    cartId,
    variantId,
    quantity
  }: {
    cartId: number,
    variantId: number,
    quantity: number
  }) {
    // Adding an item already in the cart increases its quantity instead of resetting it.
    return prisma.$transaction(async (tx): Promise<AddToCartResult> => {
      const variant = await tx.variant.findUnique({ where: { id: variantId } })
      if (!variant || variant.stock <= 0) return { error: "OUT_OF_STOCK" }

      const cartItem = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } })
      const nextQuantity = (cartItem?.quantity ?? 0) + quantity
      if (nextQuantity > maxCartQuantityFor(variant.stock)) return { error: "QUANTITY_UNAVAILABLE" }

      return {
        cartItem: cartItem
          ? await tx.cartItem.update({ where: { id: cartItem.id }, data: { quantity: nextQuantity } })
          : await tx.cartItem.create({ data: { cartId, variantId, quantity: nextQuantity } }),
      }
    }, { isolationLevel: "Serializable" })
  }
  async removeCartItemForUser(userId: number, variantId: number) {
    const result = await prisma.cartItem.deleteMany({
      where: {
        variantId,
        cart: { userId }
      }
    })
    return result.count
  }
  async incrementQuantityForUser(cartItemId: number, userId: number) {
    return prisma.$transaction(async tx => {
      const cartItem = await tx.cartItem.findFirst({
        where: {
          id: cartItemId,
          cart: { userId },
        },
        include: { variant: true },
      })

      if (
        !cartItem ||
        cartItem.quantity >= maxCartQuantityFor(cartItem.variant.stock)
      ) {
        return 0
      }

      const result = await tx.cartItem.updateMany({
        where: {
          id: cartItem.id,
          cart: { userId },
          quantity: cartItem.quantity,
        },
        data: {
          quantity: { increment: 1 },
        },
      })
      return result.count
    }, { isolationLevel: "Serializable" })
  }
  async decrementQuantityForUser(cartItemId: number, userId: number) {
    const result = await prisma.cartItem.updateMany({
      where: {
        id: cartItemId,
        cart: { userId },
        quantity: { gt: 1 }
      },
      data: {
        quantity: { decrement: 1 }
      }
    })
    return result.count
  }
}
