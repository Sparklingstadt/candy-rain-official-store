"use client"
import ProductImageGallery from "@/app/components/ProductImageGallery"
import CandyPill from "@/app/components/CandyPill"
import PurchaseAssurance, { shopifyAssurances } from "@/app/components/PurchaseAssurance"
import Link from "next/link"
import { useActionState, useState } from "react"
import { ShoppingBag } from "lucide-react"
import { addShopifyItem } from "@/app/actions/shopifyActions"
import { money, type ShopifyProductDetail } from "@/lib/shopify/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ShopifyProductActions({ product }: { product: ShopifyProductDetail }) {
  const [id, setId] = useState(product.variants.nodes.find(v => v.availableForSale)?.id ?? product.variants.nodes[0]?.id)
  const [state, action, pending] = useActionState(addShopifyItem, null)
  const variant = product.variants.nodes.find(v => v.id === id)
  const image = variant?.image ?? product.featuredImage
  return <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
    <ProductImageGallery key={`${product.id}:${id}`} initialSrc={image?.url} images={[
      ...(product.featuredImage ? [{ src: product.featuredImage.url, alt: product.featuredImage.altText || product.title }] : []),
      ...product.images.nodes.map((image, index) => ({ src: image.url, alt: image.altText || `${product.title} 画像${index + 1}` })),
      ...product.variants.nodes.flatMap(v => v.image ? [{ src: v.image.url, alt: v.image.altText || `${product.title} ${v.title}` }] : []),
    ]} />
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-6 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
        <div className="space-y-4">
          {product.productType && <CandyPill tone="lemon">{product.productType}</CandyPill>}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.title}</h1>
          <p className="text-2xl font-semibold text-primary">{money(variant?.price ?? product.priceRange.minVariantPrice)}</p>
          {product.description && <p className="whitespace-pre-line leading-7 text-muted-foreground">{product.description}</p>}
        </div>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopify-variant" className="text-muted-foreground">バリエーション</Label>
            <select id="shopify-variant" name="variantId" value={id || ""} onChange={event => setId(event.target.value)} disabled={pending || !variant} className="h-11 w-full border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              {product.variants.nodes.map(v => <option key={v.id} value={v.id} disabled={!v.availableForSale}>{v.title === "Default Title" ? product.title : v.title}{!v.availableForSale ? "（売り切れ）" : ""}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopify-quantity" className="text-muted-foreground">数量</Label>
            <Input id="shopify-quantity" name="quantity" type="number" min="1" max="99" step="1" defaultValue="1" required disabled={pending || !variant?.availableForSale} className="h-11 bg-background" />
          </div>
          <Button type="submit" className="h-11 w-full" size="lg" disabled={pending || !variant?.availableForSale}><ShoppingBag data-icon="inline-start" />{pending ? "追加中…" : variant?.availableForSale ? "カートに追加" : "売り切れ"}</Button>
          {state && <p role={state.success ? "status" : "alert"} className={state.success ? "text-sm text-candy-mint-foreground" : "text-sm text-destructive"}>{state.message}</p>}
        </form>
        <Link href="/cart" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 w-full" })}>カートを見る</Link>
        <PurchaseAssurance items={shopifyAssurances} />
      </div>
    </div>
  </div>
}
