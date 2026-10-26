import type { Metadata } from "next"
import Link from "next/link"
import { Package, Plus } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import EmptyState from "@/app/components/EmptyState"
import { Button, buttonVariants } from "@/components/ui/button"
import { requireAdmin } from "@/lib/auth"
import { parseProductView } from "@/lib/adminProductView"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { listProductsForAdmin, MAX_PRODUCTS } from "@/services/admin/productAdminService"
import ProductCardGrid from "./components/ProductCardGrid"
import ProductTable from "./components/ProductTable"
import ProductViewToggle from "./components/ProductViewToggle"

export const metadata: Metadata = { title: "商品" }

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  await requireAdmin()
  const view = parseProductView((await searchParams).view)
  const products = await listProductsForAdmin(new ProductRepository())
  const reachedLimit = products.length >= MAX_PRODUCTS

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="商品"
        actions={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {reachedLimit ? (
              <Button disabled><Plus /> 商品を登録</Button>
            ) : (
              <Link href="/admin/products/new" className={buttonVariants()}><Plus /> 商品を登録</Link>
            )}
            <p className="text-sm text-muted-foreground">
              {products.length} / {MAX_PRODUCTS} 件{reachedLimit ? "（上限に達したため登録できません）" : ""}
            </p>
          </div>
        }
      />
      {products.length === 0 ? (
        <EmptyState icon={<Package />} title="商品がありません" description="「商品を登録」から最初の商品を登録できます。" tone="lavender" />
      ) : (
        <>
          <ProductViewToggle current={view} />
          {view === "list" ? <ProductTable products={products} /> : <ProductCardGrid products={products} />}
        </>
      )}
    </div>
  )
}
