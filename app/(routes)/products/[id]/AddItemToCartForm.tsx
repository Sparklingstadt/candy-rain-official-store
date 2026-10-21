"use client"
import { addItemToCartAction } from "@/app/actions/addItemToCartAction"
import { useActionState, useState } from "react"
import Link from "next/link"
import { ArrowRight, CircleCheck, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import QuantityStepper from "@/app/components/QuantityStepper"
import { maxCartQuantityFor } from "@/lib/validation"


export default function AddItemToCartForm({
  variantId,
  stock,
}: {
  variantId: number
  stock: number
}) {
  const [state, formAction, isPending] = useActionState(addItemToCartAction, null)
  const [quantity, setQuantity] = useState(1)
  const isAvailable = stock > 0
  const maxQuantity = maxCartQuantityFor(stock)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />
      {isAvailable && (
        <div className="flex items-center justify-between gap-4">
          <p id="quantity-label" className="text-sm font-medium">数量</p>
          <QuantityStepper
            role="group"
            aria-labelledby="quantity-label"
            value={quantity}
            decrementProps={{ type: "button", disabled: isPending || quantity <= 1, onClick: () => setQuantity(quantity - 1) }}
            incrementProps={{ type: "button", disabled: isPending || quantity >= maxQuantity, onClick: () => setQuantity(quantity + 1) }}
          />
        </div>
      )}
      <Button type="submit" disabled={isPending || !isAvailable} size="lg" className="h-11 w-full">
        <ShoppingBag data-icon="inline-start" />
        {isPending ? "追加中..." : isAvailable ? "カートに追加" : "売り切れ"}
      </Button>
      <div aria-live="polite">
        {state?.success && !isPending ? (
          <div className="flex items-center justify-between gap-3 bg-candy-mint px-4 py-3 text-sm text-candy-mint-foreground">
            <p className="flex items-center gap-2 font-medium"><CircleCheck className="size-4 shrink-0" />カートに追加しました</p>
            <Link href="/cart" className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-4 hover:underline">カートを見る <ArrowRight className="size-4" /></Link>
          </div>
        ) : null}
      </div>
      {state && !state.success ? (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  )
}
