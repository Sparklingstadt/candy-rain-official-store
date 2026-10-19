import { Product, Variant } from "@/lib/types"
import { use } from "react"
import Link from "next/link"
import { PackageSearch } from "lucide-react"
import { candyToneAt } from "@/lib/candy"
import { buttonVariants } from "@/components/ui/button"
import ProductCard from "@/app/components/ProductCard"
import EmptyState from "@/app/components/EmptyState"
import { fromDemoProduct } from "@/app/components/productSummaries"

export default function ProductList({ productsPromise, filtered = false }: {
  productsPromise: Promise<(Product & { variants: Variant[] })[]>
  filtered?: boolean
}){
  const products = use(productsPromise)

  if (!products.length) {
    return (
      <EmptyState icon={<PackageSearch />} title="該当する商品はありません" description={filtered ? "別の販売区分を選ぶか、すべての商品からお探しください。" : undefined}>
        {filtered && <Link href="/products" className={buttonVariants({ variant: "outline" })}>すべての商品を見る</Link>}
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => {
        const summary = fromDemoProduct(product)
        return <ProductCard key={summary.key} product={summary} tone={candyToneAt(index)} />
      })}
    </div>
  )
}
