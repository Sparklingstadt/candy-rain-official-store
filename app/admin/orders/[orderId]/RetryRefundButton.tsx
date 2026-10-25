"use client"
import { retryRefundAction } from "@/app/actions/admin/retryRefundAction"
import { useActionState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

// Stays mounted after a successful refund so the result message survives the page refresh; only the button goes away.
export default function RetryRefundButton({ orderId, canRetry }: { orderId: number, canRetry: boolean }) {
  const [state, formAction, isPending] = useActionState(retryRefundAction, null)

  if (!canRetry && !state) return null

  return (
    <form action={formAction} className="space-y-3 border bg-card px-6 py-4 text-sm">
      {canRetry ? (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">{isPending ? "返金中..." : "返金を再試行"}</Button>
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
