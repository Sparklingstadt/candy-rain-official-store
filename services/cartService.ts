import { CartRepository } from "@/repositories/implementations/cartRepository"
import { CartItemRepository } from "@/repositories/implementations/cartItemRepository"
import { MAX_CART_QUANTITY } from "@/lib/validation"

export type CartErrorCode = "OUT_OF_STOCK" | "QUANTITY_UNAVAILABLE"

export class CartError extends Error {
  constructor(
    public readonly code: CartErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CartError"
  }
}

export async function addItemToCart({
  userId, variantId, quantity
}: {
  userId: number
  variantId: number
  quantity: number
}) {
  const cart = await new CartRepository().findByUserId(userId)
  if (!cart) throw new Error("Cart not found")

  const result = await new CartItemRepository().addToCart({ cartId: cart.id, variantId, quantity })
  if ("error" in result) {
    throw result.error === "OUT_OF_STOCK"
      ? new CartError("OUT_OF_STOCK", "選択した商品は売り切れです")
      : new CartError(
        "QUANTITY_UNAVAILABLE",
        `カートの数量と合わせて在庫数・上限（${MAX_CART_QUANTITY}個）を超えるため追加できません`,
      )
  }
}

export async function removeItemFromCart(userId: number, variantId: number) {
  const repo = new CartItemRepository()
  const count = await repo.removeCartItemForUser(userId, variantId)
  if (count !== 1) throw new Error("Cart item not found")
}

export async function updateCartItemQuantity(
  userId: number,
  cartItemId: number,
  type: "increment" | "decrement"
) {
  const repo = new CartItemRepository()

  if (type === "increment") {
    const count = await repo.incrementQuantityForUser(cartItemId, userId)
    if (count !== 1) {
      throw new CartError(
        "QUANTITY_UNAVAILABLE",
        "在庫数を超えて数量を増やすことはできません",
      )
    }
    return
  }

  const count = await repo.decrementQuantityForUser(cartItemId, userId)
  if (count !== 1) throw new Error("Cart item not found")
}
