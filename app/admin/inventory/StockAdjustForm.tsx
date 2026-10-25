"use client"
import { adjustStockAction } from "@/app/actions/admin/adjustStockAction"
import { useActionState, useState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function StockAdjustForm({ variantId, variantName }: { variantId: number, variantName: string }) {
  const [delta, setDelta] = useState("")
  const [state, formAction, isPending] = useActionState(async (prevState: unknown, formData: FormData) => {
    const result = await adjustStockAction(prevState, formData)
    // Clear the input after a successful change so the same delta is not submitted twice by accident.
    if (result.success) setDelta("")
    return result
  }, null)

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="variantId" value={variantId} />
      <div className="flex items-center gap-2">
        <Input
          name="delta"
          inputMode="numeric"
          placeholder="+10 / -3"
          aria-label={`${variantName}の在庫の増減`}
          value={delta}
          onChange={event => setDelta(event.target.value)}
          className="w-28"
        />
        <Button type="submit" variant="outline" disabled={isPending || delta.trim() === ""}>{isPending ? "更新中..." : "在庫を更新"}</Button>
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
