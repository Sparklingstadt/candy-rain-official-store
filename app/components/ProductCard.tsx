import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { candyToneClasses, type CandyTone } from "@/lib/candy"
import { salesTypeMeta } from "@/lib/salesTypes"
import { cn } from "@/lib/utils"
import CandyPill from "./CandyPill"
import type { ProductSummary } from "./productSummaries"

export default function ProductCard({ product, tone, headingLevel = "h2", sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" }: {
  product: ProductSummary
  tone: CandyTone
  headingLevel?: "h2" | "h3"
  sizes?: string
}) {
  const Heading = headingLevel
  return (
    <Link href={product.href} className="group block h-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <div className="flex h-full flex-col border bg-card p-2 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/10">
        <div className={cn("relative aspect-square overflow-hidden", candyToneClasses[tone].surface)}>
          {product.image
            ? <Image src={product.image.src} alt={product.image.alt} fill sizes={sizes} className="object-cover grayscale transition duration-500 group-hover:scale-105" />
            : <span className="flex h-full items-center justify-center text-sm text-muted-foreground">画像準備中</span>}
          <span className="absolute left-3 top-3 bg-card/90 px-2.5 py-1 text-xs font-medium">{product.category}</span>
          {product.soldOut && <>
            <span aria-hidden="true" className="absolute inset-0 bg-card/45" />
            <span className="absolute right-3 top-3 bg-foreground px-2.5 py-1 text-xs font-medium text-background">売り切れ</span>
          </>}
        </div>
        <div className="flex flex-1 flex-col gap-3 px-2 pb-2 pt-4">
          {product.salesType && <CandyPill tone={salesTypeMeta[product.salesType].tone}>{salesTypeMeta[product.salesType].label}</CandyPill>}
          <Heading className="font-medium leading-6">{product.name}</Heading>
          <div className="mt-auto flex items-center justify-between gap-3">
            <p className={cn("font-semibold", product.soldOut ? "text-muted-foreground" : "text-primary")}>{product.price}</p>
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center border transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
