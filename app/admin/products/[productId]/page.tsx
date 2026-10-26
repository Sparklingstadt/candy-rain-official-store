import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, CircleCheck, Layers, Plus } from "lucide-react"
import EmptyState from "@/app/components/EmptyState"
import { setProductPublishedAction } from "@/app/actions/admin/setProductPublishedAction"
import { setVariantPublishedAction } from "@/app/actions/admin/setVariantPublishedAction"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth"
import { formatPrice } from "@/lib/format"
import { getVariantImageUrl } from "@/lib/product-images"
import { storeStatusOf } from "@/lib/productStatus"
import { toNonNegativeInteger } from "@/lib/validation"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { getProductForAdmin, MAX_VARIANTS_PER_PRODUCT } from "@/services/admin/productAdminService"
import ProductForm from "../components/ProductForm"
import ProductStatusBadge from "../components/ProductStatusBadge"
import PublishForm from "../components/PublishForm"

type Props = {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ created?: string | string[] }>
}

async function loadProduct(params: Props["params"]) {
  const productId = toNonNegativeInteger((await params).productId)
  return productId === null ? null : getProductForAdmin(new ProductRepository(), productId)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadProduct(params))?.name ?? "商品が見つかりません" }
}

export default async function Page({ params, searchParams }: Props) {
  await requireAdmin()
  const product = await loadProduct(params)
  if (!product) notFound()
  const created = (await searchParams).created === "1"
  const status = storeStatusOf(product)
  const reachedVariantLimit = product.variants.length >= MAX_VARIANTS_PER_PRODUCT

  return (
    <div className="space-y-8">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> 商品一覧へ戻る</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">{product.name}</h1>
        <ProductStatusBadge status={status} />
      </div>
      {created ? (
        <p className="flex items-center gap-2 bg-candy-mint px-4 py-3 text-sm font-medium text-candy-mint-foreground"><CircleCheck className="size-4 shrink-0" />登録しました。バリエーションを追加して公開してください</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">公開状態</h2>
        <Card>
          <CardContent className="space-y-3">
            {status === "NOT_LISTED" ? (
              <p className="text-sm text-muted-foreground">公開中のバリエーションがないため、ストアには表示されません</p>
            ) : null}
            <PublishForm action={setProductPublishedAction} hiddenFields={{ productId: product.id }} published={product.isPublished} targetName={product.name} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">商品情報</h2>
        <Card>
          <CardContent>
            <ProductForm
              productId={product.id}
              initial={{
                name: product.name,
                description: product.description,
                category: product.category ?? "",
                salesType: product.salesType,
                thumbnailImageUrl: product.thumbnailImageUrl,
              }}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">バリエーション</h2>
            <p className="text-sm text-muted-foreground">
              価格・在庫は<Link href="/admin/inventory" className="underline underline-offset-4">在庫・価格の画面</Link>で変更します
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            {reachedVariantLimit ? (
              <Button disabled><Plus /> バリエーションを追加</Button>
            ) : (
              <Link href={`/admin/products/${product.id}/variants/new`} className={buttonVariants()}><Plus /> バリエーションを追加</Link>
            )}
            <p className="text-sm text-muted-foreground">
              {product.variants.length} / {MAX_VARIANTS_PER_PRODUCT} 件{reachedVariantLimit ? "（上限に達したため追加できません）" : ""}
            </p>
          </div>
        </div>
        {product.variants.length === 0 ? (
          <EmptyState icon={<Layers />} title="バリエーションがありません" description="「バリエーションを追加」から登録すると、公開してストアで販売できます。" tone="lavender" />
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-4">バリエーション</TableHead>
                  <TableHead className="text-right">価格</TableHead>
                  <TableHead className="text-right">在庫</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map(variant => (
                  <TableRow key={variant.id}>
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden bg-candy-lemon">
                          <Image src={getVariantImageUrl(variant)} alt="" fill className="object-cover" sizes="48px" />
                        </span>
                        <span className="font-medium">{variant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/inventory#variant-${variant.id}`} className="font-semibold underline-offset-4 hover:underline">{formatPrice(variant.price)}</Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/inventory#variant-${variant.id}`} className="underline-offset-4 hover:underline">{variant.stock}</Link>
                    </TableCell>
                    <TableCell><Badge variant={variant.isPublished ? "default" : "outline"}>{variant.isPublished ? "公開中" : "非公開"}</Badge></TableCell>
                    <TableCell className="p-4 align-top">
                      <div className="flex flex-wrap items-start gap-2">
                        <Link href={`/admin/products/${product.id}/variants/${variant.id}`} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={`${variant.name}を編集`}>編集</Link>
                        <PublishForm action={setVariantPublishedAction} hiddenFields={{ productId: product.id, variantId: variant.id }} published={variant.isPublished} targetName={variant.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  )
}
