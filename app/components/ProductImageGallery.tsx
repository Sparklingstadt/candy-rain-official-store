"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { candyToneClasses, type CandyTone } from "@/lib/candy"

export type GalleryImage = { src: string; alt: string }

export default function ProductImageGallery({ images, initialSrc, selectedSrc: controlledSrc, onSelectedSrcChange, tone = "lemon" }: {
  images: GalleryImage[]
  initialSrc?: string
  // Pass both to let a parent (e.g. the variant picker) drive the main image.
  selectedSrc?: string
  onSelectedSrcChange?: (src: string) => void
  tone?: CandyTone
}) {
  const surface = candyToneClasses[tone].surface
  const uniqueImages = images.filter((image, index) => images.findIndex(item => item.src === image.src) === index)
  const [uncontrolledSrc, setUncontrolledSrc] = useState(initialSrc ?? uniqueImages[0]?.src)
  const selectedSrc = controlledSrc ?? uncontrolledSrc
  const setSelectedSrc = onSelectedSrcChange ?? setUncontrolledSrc
  const selected = uniqueImages.find(image => image.src === selectedSrc) ?? uniqueImages[0]

  return (
    <section aria-label="商品画像" className="min-w-0 space-y-4">
      <div className={cn("relative aspect-square overflow-hidden rounded-[1.75rem]", surface)}>
        {selected ? <Image src={selected.src} alt={selected.alt} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 60vw" loading="eager" /> : <span className="flex h-full items-center justify-center text-muted-foreground">画像準備中</span>}
      </div>
      {uniqueImages.length > 1 && <div aria-label="画像を選択" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {uniqueImages.map(image => (
          <button key={image.src} type="button" aria-label={`${image.alt}の画像を表示`} aria-pressed={image.src === selected?.src} onClick={() => setSelectedSrc(image.src)} className={cn("relative aspect-square overflow-hidden rounded-2xl transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", surface, image.src === selected?.src && "ring-2 ring-primary ring-offset-2")}>
            <Image src={image.src} alt="" fill className="object-cover" sizes="(max-width: 640px) 30vw, 160px" />
          </button>
        ))}
      </div>}
    </section>
  )
}
