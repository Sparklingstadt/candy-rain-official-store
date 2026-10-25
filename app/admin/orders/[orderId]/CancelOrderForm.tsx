"use client"
import { cancelOrderAction } from "@/app/actions/admin/cancelOrderAction"
import { useActionState, useState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

// Stays mounted after a successful cancellation so the result message survives the page refresh; only the controls go away.
export default function CancelOrderForm({ orderId, canCancel }: { orderId: number, canCancel: boolean }) {
  const [state, formAction, isPending] = useActionState(cancelOrderAction, null)
  const [confirmed, setConfirmed] = useState(false)

  if (!canCancel && !state) return null

  return (
    <form action={formAction} className="space-y-3 border bg-card px-6 py-4 text-sm">
      {canCancel ? (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirm" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
            在庫を戻し、返金することを確認しました
          </label>
          <Button type="submit" variant="destructive" disabled={isPending || !confirmed} className="w-full sm:w-auto">{isPending ? "キャンセル中..." : "注文をキャンセル"}</Button>
        </>
      ) : null}
      <div aria-live="polite">
        {state?.success && !isPending ? (
          <p className="flex items-center gap-2 bg-candy-mint px-4 py-3 text-sm font-medium text-candy-mint-foreground"><CircleCheck className="size-4 shrink-0" />{state.message}</p>
        ) : null}
      </div>
      {state && !state.success ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </form>
  )
}
