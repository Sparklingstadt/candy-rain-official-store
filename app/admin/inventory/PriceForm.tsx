"use client"
import { updatePriceAction } from "@/app/actions/admin/updatePriceAction"
import { useActionState, useState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PriceForm({ variantId, variantName, currentPrice }: { variantId: number, variantName: string, currentPrice: number }) {
  const [state, formAction, isPending] = useActionState(updatePriceAction, null)
  const [nextPrice, setNextPrice] = useState(String(currentPrice))

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="currentPrice" value={currentPrice} />
      <div className="flex items-center gap-2">
        <Input
          name="nextPrice"
          inputMode="numeric"
          aria-label={`${variantName}の価格`}
          value={nextPrice}
          onChange={event => setNextPrice(event.target.value)}
          className="w-28"
        />
        <Button type="submit" variant="outline" disabled={isPending || nextPrice.trim() === String(currentPrice)}>{isPending ? "更新中..." : "価格を更新"}</Button>
      </div>
      <div aria-live="polite">
        {state?.success && !isPending ? (
          <p className="flex items-center gap-2 bg-candy-mint px-3 py-2 text-sm font-medium text-candy-mint-foreground"><CircleCheck className="size-4 shrink-0" />{state.message}</p>
        ) : null}
      </div>
      {state && !state.success ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </form>
  )
}
