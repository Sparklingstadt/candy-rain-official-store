import { isShopifyEnabled } from "@/lib/shopify/config"
import ShopifyProductDetail from "@/app/components/shopify/ShopifyProductDetail"
import { getProductById, getVariantsByProductId } from "@/services/storeQueryService"
import ProductImageView from "./ProductImageView"
import { ProductActions } from "./ProductActions"
import { requireUserId } from "@/lib/auth"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { variantRepository } from "@/repositories/implementations/variantRepository"
import Breadcrumb from "@/app/components/Breadcrumb"
import CandyPill from "@/app/components/CandyPill"
import PurchaseAssurance, { demoAssurances } from "@/app/components/PurchaseAssurance"
import { toNonNegativeInteger } from "@/lib/validation"
import { notFound } from "next/navigation"

export default async function Page({ params }: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (isShopifyEnabled()) {
    let handle: string
    try { handle = decodeURIComponent(id) } catch { notFound() }
    return <ShopifyProductDetail handle={handle} />
  }
  const productId = toNonNegativeInteger(id)
  if (productId === null) notFound()
  await requireUserId()
  const repo = new ProductRepository()
  const product = await getProductById(repo, productId)
  if(!product) notFound()
  const variantRepo = new variantRepository()
  const variants = await getVariantsByProductId(variantRepo, product.id)
  const minPrice = Math.min(...variants.map(v => v.price))
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ href: "/", label: "ホーム" }, { href: "/products", label: "商品一覧" }]} current={product.name} />
      <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
        <ProductImageView product={product} variants={variants} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
            <div className="space-y-4">
              <CandyPill tone="lemon">{product.category || "カテゴリー指定なし"}</CandyPill>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
              <p className="text-2xl font-semibold text-primary">¥{minPrice.toLocaleString()}〜</p>
              <p className="leading-7 text-muted-foreground">{product.description || "日常にさりげない彩りを添える、Candy Rain Storeのオリジナルアイテムです。"}</p>
            </div>
            <ProductActions variants={variants} />
            <PurchaseAssurance items={demoAssurances} />
          </div>
        </div>
      </div>
    </div>
  )
}
