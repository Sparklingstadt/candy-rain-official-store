import type { Metadata } from "next"
import Link from "next/link"
import { PackageOpen } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import EmptyState from "@/app/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { formatOrderDateTime, formatPrice } from "@/lib/format"
import { OrderRepository } from "@/repositories/implementations/orderRepository"
import { getOrdersForAdmin } from "@/services/admin/adminQueryService"
import { parseShippingStatusSlug } from "@/services/admin/shippingStatusTransition"
import ShippingStatusFilter from "./ShippingStatusFilter"

export const metadata: Metadata = { title: "注文管理" }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ shippingStatus?: string | string[] }>
}) {
  await requireAdmin()
  const shippingStatus = parseShippingStatusSlug((await searchParams).shippingStatus)
  const orders = await getOrdersForAdmin(new OrderRepository(), shippingStatus)

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="注文管理" />
      <ShippingStatusFilter current={shippingStatus} />
      {orders.length === 0 ? (
        <EmptyState icon={<PackageOpen />} title="該当する注文はありません" description="発送状態の絞り込みを変えてみてください。" tone="lavender" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-4">注文番号</TableHead>
                <TableHead>注文日時</TableHead>
                <TableHead>注文者</TableHead>
                <TableHead className="text-right">合計</TableHead>
                <TableHead>支払い</TableHead>
                <TableHead>発送</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="p-4"><Link href={`/admin/orders/${order.id}`} className="font-semibold text-primary hover:underline">#{order.id}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{formatOrderDateTime(order.orderedAt)}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right font-semibold">{formatPrice(order.totalPrice)}</TableCell>
                  <TableCell><Badge variant="secondary">{order.paymentStatus}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{order.shippingStatus}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
