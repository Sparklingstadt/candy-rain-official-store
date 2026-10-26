import type { Metadata } from "next"
import { Package } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import EmptyState from "@/app/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { formatPrice } from "@/lib/format"
import { salesTypeMeta } from "@/lib/salesTypes"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { listProductsForAdmin } from "@/services/admin/productAdminService"
import PriceForm from "./PriceForm"
import StockAdjustForm from "./StockAdjustForm"

export const metadata: Metadata = { title: "在庫・価格" }

export default async function Page() {
  await requireAdmin()
  const products = await listProductsForAdmin(new ProductRepository())

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="在庫・価格" />
      {products.length === 0 ? (
        <EmptyState icon={<Package />} title="商品がありません" description="商品が登録されるとここで在庫と価格を編集できます。" tone="lavender" />
      ) : products.map(product => (
        <section key={product.id} className="space-y-3">
          <h2 className="flex flex-wrap items-center gap-3 text-xl font-semibold">
            {product.name}
            <Badge variant="outline">{salesTypeMeta[product.salesType].label}</Badge>
            {product.isPublished ? null : <Badge variant="outline">非公開</Badge>}
          </h2>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-4">バリエーション</TableHead>
                  <TableHead className="text-right">価格</TableHead>
                  <TableHead className="text-right">在庫</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map(variant => (
                  <TableRow key={variant.id} id={`variant-${variant.id}`} className="scroll-mt-20">
                    <TableCell className="p-4 font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {variant.name}
                        {variant.isPublished ? null : <Badge variant="outline">非公開</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(variant.price)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-2">
                        {variant.stock <= 0 ? <Badge variant="destructive">売り切れ</Badge> : null}
                        {variant.stock}
                      </span>
                    </TableCell>
                    <TableCell className="p-4 align-top">
                      <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <StockAdjustForm variantId={variant.id} variantName={variant.name} />
                        <PriceForm variantId={variant.id} variantName={variant.name} currentPrice={variant.price} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      ))}
    </div>
  )
}
