import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import PriceSummary from "@/app/components/PriceSummary"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { formatOrderDateTime, formatPrice } from "@/lib/format"
import { toNonNegativeInteger } from "@/lib/validation"
import { OrderItemRepository } from "@/repositories/implementations/orderItemRepository"
import { OrderRepository } from "@/repositories/implementations/orderRepository"
import { getOrderForAdmin } from "@/services/admin/adminQueryService"
import { shippingStatuses } from "@/services/admin/shippingStatusTransition"
import { calculateSubtotal } from "@/services/checkout/orderPricing"
import { getOrderItemsByOrderId } from "@/services/storeQueryService"
import ShippingStatusForm from "./ShippingStatusForm"

export async function generateMetadata({ params }: { params: Promise<{ orderId: string }> }): Promise<Metadata> {
  const orderId = toNonNegativeInteger((await params).orderId)
  return { title: orderId === null ? "注文詳細" : `注文 #${orderId}` }
}

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  await requireAdmin()
  const orderId = toNonNegativeInteger((await params).orderId)
  if (orderId === null) notFound()
  const order = await getOrderForAdmin(new OrderRepository(), orderId)
  if (!order) notFound()
  const orderItems = await getOrderItemsByOrderId(new OrderItemRepository(), orderId)
  const subTotalPrice = calculateSubtotal(orderItems.map(item => ({ price: item.priceAtPurchase, quantity: item.quantity })))
  const address = order.shippingAddress
  const currentShippingStatus = shippingStatuses.find(status => status === order.shippingStatus)

  return (
    <div className="space-y-8">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> 注文一覧へ戻る</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatOrderDateTime(order.orderedAt)}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">注文 #{order.id}</h1>
        </div>
        <div className="flex gap-2"><Badge variant="secondary">{order.paymentStatus}</Badge><Badge variant="outline">{order.shippingStatus}</Badge></div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card className="h-fit py-0">
          <Table>
            <TableHeader><TableRow><TableHead className="p-4">商品名</TableHead><TableHead>価格</TableHead><TableHead>数量</TableHead><TableHead className="text-right">合計</TableHead></TableRow></TableHeader>
            <TableBody>
              {orderItems.map(item => (
                <TableRow key={item.id}><TableCell className="p-4 font-medium">{item.variantName}</TableCell><TableCell>{formatPrice(item.priceAtPurchase)}</TableCell><TableCell>{item.quantity}</TableCell><TableCell className="text-right font-semibold">{formatPrice(item.quantity * item.priceAtPurchase)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <div className="h-fit space-y-4">
          <PriceSummary title="お支払い内容" subTotalPrice={subTotalPrice} shippingPrice={order.shippingPrice} totalPrice={order.totalPrice} />
          <div className="flex items-center justify-between gap-4 border bg-card px-6 py-4 text-sm"><p className="text-muted-foreground">お支払い方法</p><p className="font-medium">{order.paymentMethodLabel ?? "決済なし"}</p></div>
          <section className="space-y-2 border bg-card px-6 py-4 text-sm">
            <h2 className="font-semibold">注文者</h2>
            <p>{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerEmail}</p>
          </section>
          <section className="space-y-2 border bg-card px-6 py-4 text-sm">
            <h2 className="font-semibold">お届け先</h2>
            {address ? (
              <address className="not-italic">
                <p>〒{address.postalCode}</p>
                <p>{address.prefecture}{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
              </address>
            ) : (
              <p className="text-muted-foreground">お届け先は登録されていません</p>
            )}
          </section>
          {currentShippingStatus && currentShippingStatus !== "キャンセル" && <ShippingStatusForm orderId={order.id} currentStatus={currentShippingStatus} />}
          {/* Cancel and refund forms are added here by later tasks. */}
        </div>
      </div>
    </div>
  )
}
