import "server-only"
import { countStoreStatuses, type StoreStatus } from "@/lib/productStatus"
import { tokyoPeriodStarts } from "@/lib/tokyoTime"
import type { AdminOrderSummary, IOrderRepository, SalesSummary } from "@/repositories/interfaces/IOrderRepository"
import type { IProductRepository } from "@/repositories/interfaces/IProductRepository"
import type { IVariantRepository } from "@/repositories/interfaces/IVariantRepository"
import { INITIAL_SHIPPING_STATUS, PREPARING_SHIPPING_STATUS, REFUND_ERROR_PAYMENT_STATUS } from "@/services/checkout/orderStatus"
import { listProductsForAdmin, MAX_PRODUCTS } from "./productAdminService"

const LIST_LIMIT = 5

export type { SalesSummary } from "@/repositories/interfaces/IOrderRepository"

export type DashboardSummary = {
  pending: { unshipped: number, preparing: number, refundErrors: number, soldOut: number }
  refundErrorOrders: AdminOrderSummary[]
  sales: { today: SalesSummary, month: SalesSummary }
  recentOrders: AdminOrderSummary[]
  products: { counts: Record<StoreStatus, number>, total: number, limit: number }
}

// Everything the dashboard shows, gathered in parallel. "Today" and "this month" are in Japan time.
export async function getDashboardSummary(
  repos: { order: IOrderRepository, variant: IVariantRepository, product: IProductRepository },
  now: Date,
): Promise<DashboardSummary> {
  const { dayStart, monthStart } = tokyoPeriodStarts(now)
  const [shippingCounts, refundErrors, soldOut, refundErrorOrders, today, month, recentOrders, products] = await Promise.all([
    repos.order.countByShippingStatus(),
    repos.order.countByPaymentStatus(REFUND_ERROR_PAYMENT_STATUS),
    repos.variant.countSoldOutOnSale(),
    repos.order.findManyForAdmin({ shippingStatus: null, paymentStatus: REFUND_ERROR_PAYMENT_STATUS, limit: LIST_LIMIT }),
    repos.order.summarizeSales(dayStart),
    repos.order.summarizeSales(monthStart),
    repos.order.findManyForAdmin({ shippingStatus: null, limit: LIST_LIMIT }),
    listProductsForAdmin(repos.product),
  ])

  return {
    pending: {
      unshipped: shippingCounts[INITIAL_SHIPPING_STATUS] ?? 0,
      preparing: shippingCounts[PREPARING_SHIPPING_STATUS] ?? 0,
      refundErrors,
      soldOut,
    },
    refundErrorOrders,
    sales: { today, month },
    recentOrders,
    products: { counts: countStoreStatuses(products), total: products.length, limit: MAX_PRODUCTS },
  }
}
