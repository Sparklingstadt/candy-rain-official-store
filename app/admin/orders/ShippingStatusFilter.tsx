import Link from "next/link"
import { shippingStatusSlugs, shippingStatuses, type ShippingStatus } from "@/services/admin/shippingStatusTransition"
import { cn } from "@/lib/utils"

const filters = [
  { key: "all", href: "/admin/orders", label: "すべて", value: null },
  ...shippingStatuses.map(status => ({ key: status, href: `/admin/orders?shippingStatus=${shippingStatusSlugs[status]}`, label: status, value: status })),
]

export default function ShippingStatusFilter({ current }: { current: ShippingStatus | null }) {
  return (
    <nav aria-label="発送状態で絞り込み">
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
                {filter.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
