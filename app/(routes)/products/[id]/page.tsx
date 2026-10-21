import { getProductById, getVariantsByProductId } from "@/services/storeQueryService"
import ProductDetailView from "./ProductDetailView"
import { requireUserId } from "@/lib/auth"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import Breadcrumb from "@/app/components/Breadcrumb"
import PurchaseAssurance, { demoAssurances } from "@/app/components/PurchaseAssurance"
import { getProductImageUrl, getVariantImageUrl } from "@/lib/product-images"
import { toNonNegativeInteger } from "@/lib/validation"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { cache } from "react"

// Shared by generateMetadata and Page so each request queries the product once.
const loadProduct = cache(async (id: string) => {
  const productId = toNonNegativeInteger(id)
  return productId === null ? null : getProductById(new ProductRepository(), productId)
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await loadProduct((await params).id)
  return { title: product?.name ?? "商品が見つかりません" }
}

export default async function Page({ params }: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireUserId()
  const product = await loadProduct(id)
  if(!product) notFound()
  const variantRepo = new VariantRepository()
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
