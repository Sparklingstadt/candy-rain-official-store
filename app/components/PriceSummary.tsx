import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

// Subtotal / shipping / total breakdown shared by the cart and order detail pages.
export default function PriceSummary({
  title,
  subTotalPrice,
  shippingPrice,
  totalPrice,
  className,
}: {
  title: string,
  subTotalPrice: number,
  shippingPrice: number,
  totalPrice: number,
  className?: string,
}) {
  return (
    <div className={cn("space-y-4 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-7", className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="flex justify-between text-sm">
        <p>小計（税込）</p>
        <p>{formatPrice(subTotalPrice)}</p>
      </div>
      <div className="flex justify-between text-sm">
        <p>送料（税込）</p>
        <p>{formatPrice(shippingPrice)}</p>
      </div>
      <Separator />
      <div className="flex items-end justify-between">
        <p className="font-medium">合計</p>
        <p className="text-2xl font-semibold text-primary">{formatPrice(totalPrice)}</p>
      </div>
    </div>
  )
}
