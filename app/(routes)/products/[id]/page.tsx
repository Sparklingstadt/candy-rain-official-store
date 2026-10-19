import { isShopifyEnabled } from "@/lib/shopify/config"
import ShopifyProductDetail from "@/app/components/shopify/ShopifyProductDetail"
import { getProductById, getVariantsByProductId } from "@/services/storeQueryService"
import ProductDetailView from "./ProductDetailView"
import { requireUserId } from "@/lib/auth"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { variantRepository } from "@/repositories/implementations/variantRepository"
import Breadcrumb from "@/app/components/Breadcrumb"
import PurchaseAssurance, { demoAssurances } from "@/app/components/PurchaseAssurance"
import { getProductImageUrl, getVariantImageUrl } from "@/lib/product-images"
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
  const images = [
    { src: getProductImageUrl(product), alt: product.name },
    ...variants.map(variant => ({ src: getVariantImageUrl(variant), alt: variant.name })),
  ]
  const variantImages = Object.fromEntries(variants.map(variant => [variant.id, getVariantImageUrl(variant)]))
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ href: "/", label: "ホーム" }, { href: "/products", label: "商品一覧" }]} current={product.name} />
      <ProductDetailView
        key={product.id}
        product={{ name: product.name, category: product.category, description: product.description, salesType: product.salesType }}
        images={images}
        variants={variants}
        variantImages={variantImages}
      >
        <PurchaseAssurance items={demoAssurances} />
      </ProductDetailView>
    </div>
  )
}
