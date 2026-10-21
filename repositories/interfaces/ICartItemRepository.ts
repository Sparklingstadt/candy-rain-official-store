import { Variant } from "@/lib/types";
import { CartItem } from "../entities/CartItem";

export interface ICartItemRepository {
  findManyByCartId(cartId: number): Promise<CartItem[]>,
  findManyWithVariantsByCartId(cartId: number): Promise<(CartItem & { variant: Variant})[]>,
  addToCart({
    cartId,
    variantId,
    quantity
  }: { 
    cartId: number,
    variantId: number, 
    quantity: number
  }): Promise<CartItem | null>,
  removeCartItemForUser(userId: number, variantId: number): Promise<number>,
  incrementQuantityForUser(cartItemId: number, userId: number): Promise<number>,
  decrementQuantityForUser(cartItemId: number, userId: number): Promise<number>

}
