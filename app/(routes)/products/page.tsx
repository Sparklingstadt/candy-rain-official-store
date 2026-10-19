import { isShopifyEnabled } from "@/lib/shopify/config"
import ShopifyCatalog from "@/app/components/shopify/ShopifyCatalog"
import { getProductsWithVariants } from "@/services/storeQueryService"
import ProductList from "./ProductList"
import { Suspense } from "react"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import PageHeader from "@/app/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"

export default async function Page({ searchParams }: { searchParams: Promise<{ after?: string }> }){
  const shopify = isShopifyEnabled()
  const { after } = await searchParams
  const repo = new ProductRepository()
  const products = shopify ? null : getProductsWithVariants(repo)

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Collection" title="商品一覧" description="毎日に小さな彩りを添える、Candy Rain Storeのオリジナルグッズ。" />
      <Suspense fallback={<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="aspect-[4/5]" />)}</div>}>
        {shopify ? <ShopifyCatalog after={after} /> : <ProductList productsPromise={products!} />}
      </Suspense>
    </div>
  )
}
