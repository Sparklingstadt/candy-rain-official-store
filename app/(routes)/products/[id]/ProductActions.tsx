"use client"
import AddItemToCartForm from "./AddItemToCartForm";
import { Variant } from "@/lib/types";
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function ProductActions({ variants, variantId, onVariantChange }: {
  variants: Variant[]
  variantId: number
  onVariantChange: (variantId: number) => void
}) {
  const selectedVariant = variants.find(variant => variant.id === variantId) ?? variants[0]

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium">バリエーションを選択</p>
        <div className="grid gap-2">
        { variants.map(v => (
          <button
            type="button"
            key={v.id}
            disabled={v.stock <= 0}
            aria-pressed={variantId === v.id}
            className={cn("flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-left text-sm transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60", variantId === v.id && "border-primary bg-primary/5 ring-1 ring-primary")}
            onClick={() => onVariantChange(v.id)}
          >
            <span className="flex items-center gap-2">{variantId === v.id && <Check className="size-4 text-primary" />}{ v.name }</span>
            <div className="flex items-center gap-2">
              {v.stock <= 0 ? <Badge variant="destructive">売り切れ</Badge> : null}
              <span className="font-semibold">¥{ v.price.toLocaleString() }</span>
            </div>
          </button>
        ))}
        </div>
      </div>
      <AddItemToCartForm
        key={variantId}
        variantId={variantId}
        isAvailable={selectedVariant.stock > 0}
      />
    </div>
  )
}
