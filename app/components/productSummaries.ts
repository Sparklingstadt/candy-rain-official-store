import { getProductImageUrl } from "@/lib/product-images"
import type { SalesType } from "@/lib/salesTypes"
import type { Product, Variant } from "@/lib/types"

// Display-only shape shared by the product list and the home page pickup.
export type ProductSummary = {
  key: string
  href: string
  name: string
  category: string
  salesType: SalesType
  price: string
  image: { src: string; alt: string } | null
  soldOut: boolean
}

export function fromDemoProduct(product: Product & { variants: Variant[] }): ProductSummary {
  return {
    key: String(product.id),
    href: `/products/${product.id}`,
    name: product.name,
    category: product.category || "グッズ",
    salesType: product.salesType,
    price: `¥${Math.min(...product.variants.map(v => v.price)).toLocaleString()}〜`,
    image: { src: getProductImageUrl(product), alt: product.name },
    soldOut: product.variants.every(variant => variant.stock <= 0),
  }
}
