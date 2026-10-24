import { CircleCheck } from "lucide-react"
import type { FormActionState } from "@/lib/types"

export default function FormMessage({ state, isPending, successMessage }: {
  state: FormActionState<string> | null
  isPending: boolean
  successMessage: string
}) {
  return (
    <>
      <div aria-live="polite">
        {state?.success && !isPending ? (
          <p className="flex items-center gap-2 bg-candy-mint px-4 py-3 text-sm font-medium text-candy-mint-foreground"><CircleCheck className="size-4 shrink-0" />{successMessage}</p>
        ) : null}
      </div>
      {state && !state.success ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </>
  )
}
