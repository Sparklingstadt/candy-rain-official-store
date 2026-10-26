import Image from "next/image"
import { productImageCatalog } from "@/lib/productImageCatalog"
import { cn } from "@/lib/utils"

// Radio buttons over the bundled artwork; uploads are intentionally not offered on the public demo.
export default function ImagePicker({ name, legend, selected, error }: {
  name: string
  legend: string
  selected: string
  error?: string
}) {
  const errorId = `field-${name}-error`
  return (
    <fieldset className="space-y-2" aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium">{legend}</legend>
      {/* Keyed by the selection so a rejected submit re-checks the image the admin chose. */}
      <div key={selected} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {productImageCatalog.map(image => (
          <label
            key={image.url}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-1 border p-1 text-xs has-checked:border-foreground has-checked:ring-2 has-checked:ring-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              error && "border-destructive",
            )}
          >
            <input type="radio" name={name} value={image.url} defaultChecked={image.url === selected} className="sr-only" />
            <span className="relative aspect-square w-full overflow-hidden bg-candy-lemon">
              <Image src={image.url} alt="" fill className="object-cover" sizes="120px" />
            </span>
            <span className="line-clamp-2 text-muted-foreground group-has-checked:text-foreground">{image.label}</span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className="text-sm text-destructive">{error}</p>}
    </fieldset>
  )
}
