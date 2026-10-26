import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Package, Plus } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import EmptyState from "@/app/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { getProductImageUrl } from "@/lib/product-images"
import { storeStatusOf } from "@/lib/productStatus"
import { salesTypeMeta } from "@/lib/salesTypes"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { listProductsForAdmin, MAX_PRODUCTS } from "@/services/admin/productAdminService"
import ProductStatusBadge from "./components/ProductStatusBadge"

export const metadata: Metadata = { title: "商品" }

export default async function Page() {
  await requireAdmin()
  const products = await listProductsForAdmin(new ProductRepository())
  const reachedLimit = products.length >= MAX_PRODUCTS

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="商品"
        actions={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {reachedLimit ? (
              <Button disabled><Plus /> 商品を登録</Button>
            ) : (
              <Link href="/admin/products/new" className={buttonVariants()}><Plus /> 商品を登録</Link>
            )}
            <p className="text-sm text-muted-foreground">
              {products.length} / {MAX_PRODUCTS} 件{reachedLimit ? "（上限に達したため登録できません）" : ""}
            </p>
          </div>
        }
      />
      {products.length === 0 ? (
        <EmptyState icon={<Package />} title="商品がありません" description="「商品を登録」から最初の商品を登録できます。" tone="lavender" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-4">商品</TableHead>
                <TableHead>販売区分</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">バリエーション（公開中 / 全件）</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden bg-candy-lemon">
                        <Image src={getProductImageUrl(product)} alt="" fill className="object-cover" sizes="48px" />
                      </span>
                      <Link href={`/admin/products/${product.id}`} className="font-medium underline-offset-4 hover:underline">{product.name}</Link>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{salesTypeMeta[product.salesType].label}</Badge></TableCell>
                  <TableCell><ProductStatusBadge status={storeStatusOf(product)} /></TableCell>
                  <TableCell className="text-right">
                    {product.variants.filter(variant => variant.isPublished).length} / {product.variants.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
