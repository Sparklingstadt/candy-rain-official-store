import { Separator } from "@/components/ui/separator"

export async function CartSummary({
  subTotalPrice,
  shippingFee,
  totalPrice
}: {
  subTotalPrice: number,
  shippingFee: number,
  totalPrice: number
}) {
  return (
    <div className="space-y-4 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-7">
      <h2 className="text-xl font-semibold">ご注文内容</h2>
      <div className="flex justify-between text-sm">
        <p>小計</p>
        <p>¥{subTotalPrice.toLocaleString()}</p>
      </div>
      <div className="flex justify-between text-sm">
        <p>送料</p>
        <p>¥{shippingFee.toLocaleString()}</p>
      </div>
      <Separator />
      <div className="flex items-end justify-between">
        <p className="font-medium">合計</p>
        <p className="text-2xl font-semibold text-primary">¥{totalPrice.toLocaleString()}</p>
      </div>
    </div>
  )
}
