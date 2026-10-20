import { CartRepository } from "@/repositories/implementations/cartRepository"
import { CartItemRepository } from "@/repositories/implementations/cartItemRepository"
import { VariantRepository } from "@/repositories/implementations/variantRepository"

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
  const cartRepo = new CartRepository()
  const variantRepo = new VariantRepository()
  const [cart, variant] = await Promise.all([
    cartRepo.findByUserId(userId),
    variantRepo.findById(variantId),
  ])
  if (!cart) throw new Error("Cart not found")
  if (!variant || variant.stock < quantity) {
    throw new CartError("OUT_OF_STOCK", "選択した商品は売り切れです")
  }

  const repo = new CartItemRepository()
  await repo.addToCart({ cartId: cart.id, variantId, quantity })
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
