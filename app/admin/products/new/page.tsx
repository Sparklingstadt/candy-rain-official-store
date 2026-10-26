import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { requireAdmin } from "@/lib/auth"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { listProductsForAdmin, MAX_PRODUCTS } from "@/services/admin/productAdminService"
import ProductForm from "../components/ProductForm"

export const metadata: Metadata = { title: "商品を登録" }

export default async function Page() {
  await requireAdmin()
  const reachedLimit = (await listProductsForAdmin(new ProductRepository())).length >= MAX_PRODUCTS

  return (
    <div className="space-y-8">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> 商品一覧へ戻る</Link>
      <PageHeader eyebrow="Admin" title="商品を登録" description="登録した商品は非公開で作成されます。バリエーションを追加してから公開してください。" />
      {reachedLimit ? (
        <p role="alert" className="text-sm text-destructive">登録できる商品は {MAX_PRODUCTS} 件までです</p>
      ) : (
        <Card>
          <CardContent>
            <ProductForm initial={{ name: "", description: "", category: "", salesType: "PERMANENT", thumbnailImageUrl: "" }} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
