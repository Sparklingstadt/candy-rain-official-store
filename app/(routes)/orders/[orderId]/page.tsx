import { getOrderByOrderIdForUser, getOrderItemsByOrderId } from "@/services/storeQueryService"
import { requireUserId } from "@/lib/auth"
import { OrderItemRepository } from "@/repositories/implementations/orderItemRepository"
import { OrderRepository } from "@/repositories/implementations/orderRepository"
import Link from "next/link"
import { ChevronLeft, PartyPopper } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { notFound } from "next/navigation"
import { toNonNegativeInteger } from "@/lib/validation"
import { formatOrderDateTime, formatPrice } from "@/lib/format"
import { calculateSubtotal } from "@/services/checkout/orderPricing"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{'orderId': string}>
  searchParams: Promise<{ placed?: string }>
}) {
  const { orderId } = await params
  const { placed } = await searchParams
  const parsedOrderId = toNonNegativeInteger(orderId)
  if (parsedOrderId === null) notFound()
  const userId = await requireUserId()
  const orderRepo = new OrderRepository()
  const order = await getOrderByOrderIdForUser(orderRepo, parsedOrderId, userId)
  if (!order) notFound()
  const orderItemRepo = new OrderItemRepository()
  const orderItems = await getOrderItemsByOrderId(orderItemRepo, parsedOrderId)
  const subTotalPrice = calculateSubtotal(orderItems.map(item => ({ price: item.priceAtPurchase, quantity: item.quantity })))

  return (
    <div className="space-y-8">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> 注文一覧へ戻る</Link>
      {placed === "1" ? (
        <div role="status" className="flex items-start gap-3 bg-candy-mint p-5 text-candy-mint-foreground">
          <PartyPopper className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">ご注文ありがとうございます</p>
            <p className="mt-1 text-sm">注文 #{orderId} を受け付けました。配送状況はこのページと注文履歴から確認できます。</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">{formatOrderDateTime(order.orderedAt)}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">注文 #{orderId}</h1></div><div className="flex gap-2"><Badge variant="secondary">{order.paymentStatus}</Badge><Badge variant="outline">{order.shippingStatus}</Badge></div></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <Card className="hidden h-fit py-0 md:flex"><Table><TableHeader><TableRow><TableHead className="p-4">商品名</TableHead><TableHead>価格</TableHead><TableHead>数量</TableHead><TableHead className="text-right">合計</TableHead></TableRow></TableHeader><TableBody>
          { orderItems.map(item => (
            <TableRow key={item.variantId}><TableCell className="p-4 font-medium">{item.variantName}</TableCell><TableCell>{formatPrice(item.priceAtPurchase)}</TableCell><TableCell>{item.quantity}</TableCell><TableCell className="text-right font-semibold">{formatPrice(item.quantity * item.priceAtPurchase)}</TableCell></TableRow>
          ))}
        </TableBody></Table></Card>
      <div className="grid gap-3 md:hidden">
        {orderItems.map(item => (
          <Card key={item.variantId}>
            <CardContent className="space-y-3">
              <p className="font-medium">{item.variantName}</p>
              <div className="flex items-end justify-between gap-4 text-sm">
                <p className="text-muted-foreground">{formatPrice(item.priceAtPurchase)} × {item.quantity}</p>
                <p className="shrink-0 font-semibold">{formatPrice(item.quantity * item.priceAtPurchase)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="h-fit shadow-xl shadow-primary/5"><CardHeader><CardTitle>お支払い内容</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex justify-between text-sm"><p>小計(税込)</p><p>{formatPrice(subTotalPrice)}</p></div><div className="flex justify-between text-sm"><p>送料(税込)</p><p>{formatPrice(order.shippingPrice)}</p></div><Separator /><div className="flex items-end justify-between"><p className="font-medium">合計</p><p className="text-2xl font-semibold text-primary">{formatPrice(order.totalPrice)}</p></div></CardContent></Card>
      </div>
    </div>
  )
}
