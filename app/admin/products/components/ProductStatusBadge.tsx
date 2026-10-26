import { Badge } from "@/components/ui/badge"
import { storeStatusLabel, type StoreStatus } from "@/lib/productStatus"

const variants = { PUBLISHED: "default", UNPUBLISHED: "outline", NOT_LISTED: "secondary" } as const

export default function ProductStatusBadge({ status }: { status: StoreStatus }) {
  return <Badge variant={variants[status]}>{storeStatusLabel[status]}</Badge>
}
