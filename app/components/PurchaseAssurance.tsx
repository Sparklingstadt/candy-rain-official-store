import { candyToneAt, candyToneClasses } from "@/lib/candy"
import { formatPrice } from "@/lib/format"
import { SHIPPING_PRICE } from "@/services/checkout/orderPricing"
import { cn } from "@/lib/utils"

export const demoAssurances = [
  "デモストアのため実際の決済は発生しません",
  "在庫は注文確定時にあらためて確認します",
  `デモ送料は一律 ${formatPrice(SHIPPING_PRICE)} です`,
]

export default function PurchaseAssurance({ items }: { items: string[] }) {
  return (
    <ul aria-label="ご購入について" className="space-y-2.5 bg-muted p-4 text-sm">
      {items.map((item, index) => (
        <li key={item} className="flex items-center gap-2.5">
          <span aria-hidden="true" className={cn("size-2 shrink-0", candyToneClasses[candyToneAt(index)].strong)} />
          {item}
        </li>
      ))}
    </ul>
  )
}
