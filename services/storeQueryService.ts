import "server-only"
import { ICartItemRepository } from "@/repositories/interfaces/ICartItemRepository"
import { ICartRepository } from "@/repositories/interfaces/ICartRepository"
import { IOrderItemRepository } from "@/repositories/interfaces/IOrderItemRepository"
import { IOrderRepository } from "@/repositories/interfaces/IOrderRepository"
import { IProductRepository } from "@/repositories/interfaces/IProductRepository"
import { IUserRepository } from "@/repositories/interfaces/IUserRepository"
import { IVariantRepository } from "@/repositories/interfaces/IVariantRepository"
import type { SalesType } from "@/lib/salesTypes"

export const getProductsWithVariants = (repo: IProductRepository, salesType?: SalesType | null) => repo.findManyWithVariants(salesType)
export const getProductById = (repo: IProductRepository, productId: number) => repo.findById(productId)
export const getVariantsByProductId = (repo: IVariantRepository, productId: number) => repo.findManyByProductId(productId)
export const getUserByUserId = (repo: IUserRepository, userId: number) => repo.findByUserId(userId)
export const getOrders = (repo: IOrderRepository, userId: number) => repo.findManyByUserId(userId)
export const getOrderByOrderIdForUser = (repo: IOrderRepository, orderId: number, userId: number) => repo.findByOrderIdForUser(orderId, userId)
export const getOrderItemsByOrderId = (repo: IOrderItemRepository, orderId: number) => repo.findManyByOrderId(orderId)
export const getCartByUserId = (repo: ICartRepository, userId: number) => repo.findByUserId(userId)
export const getCartItemsWithVariantsByCartId = (repo: ICartItemRepository, cartId: number) => repo.findManyWithVariantsByCartId(cartId)
