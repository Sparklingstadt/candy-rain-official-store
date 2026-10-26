import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { requireAdmin } from "@/lib/auth"
import { toNonNegativeInteger } from "@/lib/validation"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { getProductForAdmin, MAX_VARIANTS_PER_PRODUCT } from "@/services/admin/productAdminService"
import VariantForm from "../../../components/VariantForm"

export const metadata: Metadata = { title: "バリエーションを追加" }

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  await requireAdmin()
  const productId = toNonNegativeInteger((await params).productId)
  const product = productId === null ? null : await getProductForAdmin(new ProductRepository(), productId)
  if (!product) notFound()
  const reachedLimit = product.variants.length >= MAX_VARIANTS_PER_PRODUCT

  return (
    <div className="space-y-8">
      <Link href={`/admin/products/${product.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> {product.name}へ戻る</Link>
      <PageHeader eyebrow={product.name} title="バリエーションを追加" description="追加したバリエーションは非公開で作成されます。" />
      {reachedLimit ? (
        <p role="alert" className="text-sm text-destructive">1 つの商品に登録できるバリエーションは {MAX_VARIANTS_PER_PRODUCT} 件までです</p>
      ) : (
        <Card>
          <CardContent>
            <VariantForm productId={product.id} initial={{ name: "", price: "", stock: "0", imageUrl: "" }} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
