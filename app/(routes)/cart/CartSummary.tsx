import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/format"

export function CartSummary({
  subTotalPrice,
  shippingPrice,
  totalPrice
}: {
  subTotalPrice: number,
  shippingPrice: number,
  totalPrice: number
}) {
  return (
    <div className="space-y-4 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-7">
      <h2 className="text-xl font-semibold">ご注文内容</h2>
      <div className="flex justify-between text-sm">
        <p>小計</p>
        <p>{formatPrice(subTotalPrice)}</p>
      </div>
      <div className="flex justify-between text-sm">
        <p>送料</p>
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
