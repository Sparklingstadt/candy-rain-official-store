"use client"
import { updatePriceAction } from "@/app/actions/admin/updatePriceAction"
import { useActionState, useState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PriceForm({ variantId, variantName, currentPrice }: { variantId: number, variantName: string, currentPrice: number }) {
  const [state, formAction, isPending] = useActionState(updatePriceAction, null)
  const [nextPrice, setNextPrice] = useState(String(currentPrice))
  // The price the field was seeded from. It is submitted as currentPrice so an edit based on an outdated price is rejected (STALE_PRICE).
  const [seedPrice, setSeedPrice] = useState(currentPrice)
  const [handledState, setHandledState] = useState(state)
  const trimmed = nextPrice.trim()
  if (currentPrice !== seedPrice) {
    if (trimmed === String(seedPrice)) {
      // Untouched field: follow the new price.
      setNextPrice(String(currentPrice))
      setSeedPrice(currentPrice)
    } else if (Number(trimmed) === currentPrice) {
      // This form's own update landed.
      setSeedPrice(currentPrice)
    } else if (state !== handledState && state && !state.success) {
      // The admin has just been told the price is stale and now sees the latest one, so a resubmit is deliberate.
      setSeedPrice(currentPrice)
    }
    // Otherwise keep the old seed so submitting the edit is rejected as STALE_PRICE instead of silently reverting.
  }
  if (state !== handledState) setHandledState(state)
  const isUnchanged = trimmed !== "" && Number(trimmed) === seedPrice

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="currentPrice" value={seedPrice} />
      <div className="flex items-center gap-2">
        <Input
          name="nextPrice"
          inputMode="numeric"
          aria-label={`${variantName}の価格`}
          value={nextPrice}
          onChange={event => setNextPrice(event.target.value)}
          className="w-28"
        />
        <Button type="submit" variant="outline" disabled={isPending || isUnchanged} aria-label={`${variantName}の価格を更新`}>{isPending ? "更新中..." : "価格を更新"}</Button>
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
