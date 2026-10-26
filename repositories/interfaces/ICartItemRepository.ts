import { Variant } from "@/lib/types";
import { CartItem } from "../entities/CartItem";

export type AddToCartResult =
  | { cartItem: CartItem }
  | { error: "OUT_OF_STOCK" | "QUANTITY_UNAVAILABLE" | "UNAVAILABLE" }

export interface ICartItemRepository {
  findManyByCartId(cartId: number): Promise<CartItem[]>,
  findManyWithVariantsByCartId(cartId: number): Promise<(CartItem & { variant: Variant & { isPublished: boolean, product: { isPublished: boolean } } })[]>,
  addToCart({
    cartId,
    variantId,
    quantity
  }: { 
    cartId: number,
    variantId: number, 
    quantity: number
  }): Promise<AddToCartResult>,
  removeCartItemForUser(userId: number, variantId: number): Promise<number>,
  incrementQuantityForUser(cartItemId: number, userId: number): Promise<number>,
  decrementQuantityForUser(cartItemId: number, userId: number): Promise<number>

}
