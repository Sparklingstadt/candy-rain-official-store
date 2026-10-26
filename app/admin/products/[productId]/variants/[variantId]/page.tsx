import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { requireAdmin } from "@/lib/auth"
import { toNonNegativeInteger } from "@/lib/validation"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { getProductForAdmin, getVariantForAdmin } from "@/services/admin/productAdminService"
import VariantForm from "../../../components/VariantForm"

export const metadata: Metadata = { title: "バリエーションを編集" }

export default async function Page({ params }: { params: Promise<{ productId: string, variantId: string }> }) {
  await requireAdmin()
  const raw = await params
  const productId = toNonNegativeInteger(raw.productId)
  const variantId = toNonNegativeInteger(raw.variantId)
  if (productId === null || variantId === null) notFound()
  // A variant id from another product is treated as missing, like the update itself.
  const [product, variant] = await Promise.all([
    getProductForAdmin(new ProductRepository(), productId),
    getVariantForAdmin(new VariantRepository(), productId, variantId),
  ])
  if (!product || !variant) notFound()

  return (
    <div className="space-y-8">
      <Link href={`/admin/products/${product.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> {product.name}へ戻る</Link>
      <PageHeader eyebrow={product.name} title="バリエーションを編集" description="価格・在庫は在庫・価格の画面で変更します。" />
      <Card>
        <CardContent>
          <VariantForm
            productId={product.id}
            variantId={variant.id}
            initial={{ name: variant.name, price: String(variant.price), stock: String(variant.stock), imageUrl: variant.imageUrl }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
