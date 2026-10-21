import { prisma } from "@/lib/prisma"
import { ICartItemRepository } from "../interfaces/ICartItemRepository"
import { MAX_CART_QUANTITY } from "@/lib/validation"

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
    return prisma.$transaction(async tx => {
      const [variant, cartItem] = await Promise.all([
        tx.variant.findUnique({ where: { id: variantId } }),
        tx.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } }),
      ])
      const nextQuantity = (cartItem?.quantity ?? 0) + quantity
      if (!variant || nextQuantity > variant.stock || nextQuantity > MAX_CART_QUANTITY) {
        return null
      }

      return tx.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId,
            variantId
          }
        },
        update: {
          quantity: nextQuantity
        },
        create: {
          cartId,
          variantId,
          quantity
        }
      })
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
        cartItem.quantity >= MAX_CART_QUANTITY ||
        cartItem.quantity >= cartItem.variant.stock
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
