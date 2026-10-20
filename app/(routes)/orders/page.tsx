import { requireUserId } from "@/lib/auth"
import { getOrders } from "@/services/storeQueryService"
import { OrderRepository } from "@/repositories/implementations/orderRepository"
import PageHeader from "@/app/components/PageHeader"
import OrderHistory from "@/app/components/OrderHistory"

export default async function Page() {
  const userId = await requireUserId()
  const repo = new OrderRepository()
  const orders = await getOrders(repo, userId)

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Order history" title="注文履歴" tone="lavender" description="これまでの注文内容と配送状況を確認できます。" />
      <OrderHistory orders={orders} />
    </div>
  )
}
