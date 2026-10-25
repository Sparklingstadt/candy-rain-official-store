"use client"
import { updateShippingStatusAction } from "@/app/actions/admin/updateShippingStatusAction"
import { useActionState, useState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { changeableShippingStatuses, type ShippingStatus } from "@/services/admin/shippingStatusTransition"

export default function ShippingStatusForm({ orderId, currentStatus }: { orderId: number, currentStatus: ShippingStatus }) {
  const [state, formAction, isPending] = useActionState(updateShippingStatusAction, null)
  const [nextStatus, setNextStatus] = useState<string>(currentStatus)

  return (
    <form action={formAction} className="space-y-3 border bg-card px-6 py-4 text-sm">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="currentStatus" value={currentStatus} />
      <label htmlFor="nextStatus" className="block font-semibold">発送ステータス</label>
      <select
        id="nextStatus"
        name="nextStatus"
        value={nextStatus}
        onChange={event => setNextStatus(event.target.value)}
        className="h-8 w-full border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
      >
        {changeableShippingStatuses.map(status => <option key={status} value={status}>{status}</option>)}
      </select>
      <Button type="submit" disabled={isPending || nextStatus === currentStatus} className="w-full sm:w-auto">{isPending ? "変更中..." : "発送ステータスを変更"}</Button>
      <div aria-live="polite">
        {state?.success && !isPending ? (
          <p className="flex items-center gap-2 bg-candy-mint px-4 py-3 text-sm font-medium text-candy-mint-foreground"><CircleCheck className="size-4 shrink-0" />{state.message}</p>
        ) : null}
      </div>
      {state && !state.success ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </form>
  )
}
