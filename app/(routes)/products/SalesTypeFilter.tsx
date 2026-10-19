import Link from "next/link"
import { candyToneClasses } from "@/lib/candy"
import { salesTypeMeta, salesTypes, type SalesType } from "@/lib/salesTypes"
import { cn } from "@/lib/utils"

const filters = [
  { key: "all", href: "/products", label: "すべて", value: null, tone: null },
  ...salesTypes.map(type => ({ key: type, href: `/products?type=${salesTypeMeta[type].slug}`, label: salesTypeMeta[type].label, value: type, tone: salesTypeMeta[type].tone })),
]

export default function SalesTypeFilter({ current }: { current: SalesType | null }) {
  return (
    <nav aria-label="販売区分で絞り込み">
      <ul className="flex flex-wrap gap-2">
        {filters.map(filter => {
          const active = filter.value === current
          return (
            <li key={filter.key}>
              <Link
                href={filter.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 border px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground",
                )}
              >
                {filter.tone && <span aria-hidden="true" className={cn("size-2", candyToneClasses[filter.tone].strong, active && "ring-1 ring-background")} />}
                {filter.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
