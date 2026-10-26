import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getProductImageUrl } from "@/lib/product-images"
import { storeStatusOf } from "@/lib/productStatus"
import { salesTypeMeta } from "@/lib/salesTypes"
import type { ProductForAdmin } from "@/repositories/entities/Product"
import ProductStatusBadge from "./ProductStatusBadge"

// Same facts as the list view; each whole card opens the product's edit page.
export default function ProductCardGrid({ products }: { products: ProductForAdmin[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map(product => (
        <li key={product.id}>
          <Link
            href={`/admin/products/${product.id}`}
            className="group flex h-full flex-col border bg-card transition hover:border-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="relative aspect-square w-full overflow-hidden bg-candy-lemon">
              <Image src={getProductImageUrl(product)} alt="" fill className="object-cover" sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
            </span>
            <span className="flex flex-1 flex-col gap-3 p-4">
              <span className="font-medium underline-offset-4 group-hover:underline">{product.name}</span>
              <span className="flex flex-wrap gap-2">
                <Badge variant="outline">{salesTypeMeta[product.salesType].label}</Badge>
                <ProductStatusBadge status={storeStatusOf(product)} />
              </span>
              <span className="mt-auto text-sm text-muted-foreground">
                バリエーション（公開中 / 全件）: {product.variants.filter(variant => variant.isPublished).length} / {product.variants.length}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
