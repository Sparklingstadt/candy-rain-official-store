import type { Metadata } from "next"
import { getProductsWithVariants } from "@/services/storeQueryService"
import ProductList from "./ProductList"
import SalesTypeFilter from "./SalesTypeFilter"
import { Suspense } from "react"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import PageHeader from "@/app/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { parseSalesTypeSlug } from "@/lib/salesTypes"

export const metadata: Metadata = { title: "商品一覧" }

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }){
  const { type } = await searchParams
  const salesType = parseSalesTypeSlug(type)
  const repo = new ProductRepository()
  const products = getProductsWithVariants(repo, salesType)

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Collection" title="商品一覧" description="毎日に小さな彩りを添える、Candy Rain Storeのオリジナルグッズ。" />
      <SalesTypeFilter current={salesType} />
      <Suspense key={salesType ?? "all"} fallback={<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="aspect-[4/5]" />)}</div>}>
        <ProductList productsPromise={products} filtered={salesType !== null} />
      </Suspense>
    </div>
  )
}
