"use client"

import { useState } from "react"
import ProductImageGallery, { type GalleryImage } from "@/app/components/ProductImageGallery"
import CandyPill from "@/app/components/CandyPill"
import { Variant } from "@/lib/types"
import { salesTypeMeta, type SalesType } from "@/lib/salesTypes"
import { ProductActions } from "./ProductActions"

export default function ProductDetailView({ product, images, variants, variantImages, children }: {
  product: { name: string; category: string | null; description: string; salesType: SalesType }
  images: GalleryImage[]
  variants: Variant[]
  variantImages: Record<number, string>
  children: React.ReactNode
}) {
  const [variantId, setVariantId] = useState(
    variants.find(variant => variant.stock > 0)?.id ?? variants[0].id,
  )
  // Start on the product's overall image; switch to a variant's image once the shopper picks one.
  const [imageSrc, setImageSrc] = useState(images[0]?.src)
  const selectedVariant = variants.find(variant => variant.id === variantId) ?? variants[0]

  const selectVariant = (id: number) => {
    setVariantId(id)
    const src = variantImages[id]
    if (src) setImageSrc(src)
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
      <ProductImageGallery images={images} selectedSrc={imageSrc} onSelectedSrcChange={setImageSrc} />
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-6 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <CandyPill tone={salesTypeMeta[product.salesType].tone}>{salesTypeMeta[product.salesType].label}</CandyPill>
              <span className="inline-flex w-fit items-center border px-2.5 py-1 text-xs font-medium">{product.category || "カテゴリー指定なし"}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="text-2xl font-semibold text-primary">
              ¥{selectedVariant.price.toLocaleString()}
              <span className="ml-2 text-sm font-medium text-muted-foreground">{selectedVariant.name}</span>
            </p>
            <p className="leading-7 text-muted-foreground">{product.description || "日常にさりげない彩りを添える、Candy Rain Storeのオリジナルアイテムです。"}</p>
          </div>
          <ProductActions variants={variants} variantId={variantId} onVariantChange={selectVariant} />
          {children}
        </div>
      </div>
    </div>
  )
}
