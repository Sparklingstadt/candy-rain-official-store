import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getProductImageUrl } from "@/lib/product-images"
import { storeStatusOf } from "@/lib/productStatus"
import { salesTypeMeta } from "@/lib/salesTypes"
import type { ProductForAdmin } from "@/repositories/entities/Product"
import ProductStatusBadge from "./ProductStatusBadge"

export default function ProductTable({ products }: { products: ProductForAdmin[] }) {
  return (
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
  )
}
