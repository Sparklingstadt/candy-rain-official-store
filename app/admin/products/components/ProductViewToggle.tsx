import Link from "next/link"
import { LayoutGrid, List } from "lucide-react"
import type { ProductView } from "@/lib/adminProductView"
import { cn } from "@/lib/utils"

const views = [
  { value: "card", href: "/admin/products", label: "カード", icon: LayoutGrid },
  { value: "list", href: "/admin/products?view=list", label: "リスト", icon: List },
] as const

// Styled like the store's sales-type filter: plain links, so the view lives in the URL.
export default function ProductViewToggle({ current }: { current: ProductView }) {
  return (
    <nav aria-label="表示の切り替え">
      <ul className="flex gap-2">
        {views.map(view => {
          const active = view.value === current
          const Icon = view.icon
          return (
            <li key={view.value}>
              <Link
                href={view.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 border px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {view.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
