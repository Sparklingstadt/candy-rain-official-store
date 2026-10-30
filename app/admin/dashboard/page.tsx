import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, PackageOpen } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import EmptyState from "@/app/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { formatOrderDateTime, formatPrice } from "@/lib/format"
import { storeStatusLabel, type StoreStatus } from "@/lib/productStatus"
import type { AdminOrderSummary } from "@/repositories/interfaces/IOrderRepository"
import { OrderRepository } from "@/repositories/implementations/orderRepository"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { getDashboardSummary } from "@/services/admin/dashboardService"
import { shippingStatusSlugs } from "@/services/admin/shippingStatusTransition"
import { INITIAL_SHIPPING_STATUS, PREPARING_SHIPPING_STATUS } from "@/services/checkout/orderStatus"

export const metadata: Metadata = { title: "ダッシュボード" }

const storeStatuses: StoreStatus[] = ["PUBLISHED", "UNPUBLISHED", "NOT_LISTED"]

function Section({ id, title, action, children }: { id: string, title: string, action?: React.ReactNode, children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// One figure; with href the whole tile links to the matching list.
function Stat({ label, value, href, note }: { label: string, value: string, href?: string, note?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
    </>
  )
  const className = "flex flex-col gap-1 border bg-card px-4 py-3"
  return href ? (
    <Link href={href} className={`${className} hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function SectionLink({ href, children }: { href: string, children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{children}<ArrowRight className="size-4" /></Link>
}

function OrderTable({ orders, label }: { orders: AdminOrderSummary[], label: string }) {
  return (
    <Card className="py-0">
      <Table aria-label={label}>
        <TableHeader>
          <TableRow>
            <TableHead className="p-4">注文番号</TableHead>
            <TableHead>注文日時</TableHead>
            <TableHead>注文者</TableHead>
            <TableHead className="text-right">金額</TableHead>
            <TableHead>決済状態</TableHead>
            <TableHead>発送状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(order => (
            <TableRow key={order.id}>
              <TableCell className="p-4"><Link href={`/admin/orders/${order.id}`} className="font-medium underline-offset-4 hover:underline">#{order.id}</Link></TableCell>
              <TableCell>{formatOrderDateTime(order.orderedAt)}</TableCell>
              <TableCell>{order.customerName}</TableCell>
              <TableCell className="text-right font-semibold">{formatPrice(order.totalPrice)}</TableCell>
              <TableCell><Badge variant="outline">{order.paymentStatus}</Badge></TableCell>
              <TableCell><Badge variant="outline">{order.shippingStatus}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default async function Page() {
  await requireAdmin()
  const summary = await getDashboardSummary(
    { order: new OrderRepository(), variant: new VariantRepository(), product: new ProductRepository() },
    new Date(),
  )
  const { pending, sales, products } = summary

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Admin" title="ダッシュボード" />

      <Section id="dashboard-pending" title="対応待ち">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="未発送" value={`${pending.unshipped} 件`} href={`/admin/orders?shippingStatus=${shippingStatusSlugs[INITIAL_SHIPPING_STATUS]}`} />
          <Stat label="発送準備中" value={`${pending.preparing} 件`} href={`/admin/orders?shippingStatus=${shippingStatusSlugs[PREPARING_SHIPPING_STATUS]}`} />
          <Stat label="返金エラー" value={`${pending.refundErrors} 件`} />
          <Stat label="売り切れ" value={`${pending.soldOut} 件`} href="/admin/inventory" note="公開中のバリエーション" />
        </div>
        {summary.refundErrorOrders.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">返金に失敗した注文（新しい順に最大 5 件）。注文詳細から返金を再試行できます。</p>
            <OrderTable orders={summary.refundErrorOrders} label="返金エラーの注文" />
          </div>
        ) : null}
      </Section>

      <Section id="dashboard-sales" title="注文と売上">
        <p className="text-sm text-muted-foreground">注文日時を基準に日本時間で集計。すべて送料込み・キャンセルを除きます。</p>
        <p className="text-sm text-muted-foreground">注文総額は未決済・決済エラーも含みます。決済済み売上は「支払い済み」の注文のみで、支払い待ち・決済エラー・返金済み・返金エラーは含みません。</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {([
            ["今日", sales.today],
            ["今月", sales.month],
          ] as const).map(([period, figures]) => (
            <div key={period} className="grid grid-cols-2 gap-3">
              <Stat label={`${period}の注文総額`} value={formatPrice(figures.totalPrice)} note={`${figures.orderCount} 件・未決済を含む`} />
              <Stat label={`${period}の決済済み売上`} value={formatPrice(figures.paidTotalPrice)} note={`${figures.paidOrderCount} 件・支払い済みのみ`} />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">過去の注文をキャンセル・返金すると、その注文日の集計が変わります。入金日・返金日ごとの収支ではありません。キャンセル後の返金失敗も売上から除かれるため、未解決の返金は「対応待ち」で確認してください。</p>
      </Section>

      <Section id="dashboard-recent-orders" title="最新の注文" action={<SectionLink href="/admin/orders">注文一覧へ</SectionLink>}>
        {summary.recentOrders.length === 0 ? (
          <EmptyState icon={<PackageOpen />} title="注文はまだありません" tone="lavender" />
        ) : (
          <OrderTable orders={summary.recentOrders} label="最新の注文" />
        )}
      </Section>

      <Section id="dashboard-products" title="商品の状態" action={<SectionLink href="/admin/products">商品へ</SectionLink>}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {storeStatuses.map(status => (
            <Stat key={status} label={storeStatusLabel[status]} value={`${products.counts[status]} 件`} />
          ))}
          <Stat label="登録数" value={`${products.total} / ${products.limit} 件`} />
        </div>
      </Section>
    </div>
  )
}
