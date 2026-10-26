"use client"
import { useActionState } from "react"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/lib/types"

type PublishAction = (prevState: unknown, formData: FormData) => Promise<ActionResult<{ message: string }>>

// Sends the target state (not a toggle) so a double submit still ends as the button said.
export default function PublishForm({ action, hiddenFields, published, targetName }: {
  action: PublishAction
  hiddenFields: Record<string, number>
  published: boolean
  targetName: string
}) {
  const [state, formAction, isPending] = useActionState(action, null)
  const label = published ? "非公開にする" : "公開する"

  return (
    <form action={formAction} className="space-y-2">
      {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="published" value={String(!published)} />
      <Button type="submit" variant={published ? "outline" : "default"} size="sm" disabled={isPending} aria-label={`${targetName}を${label}`}>
        {isPending ? "更新中..." : label}
      </Button>
      <div aria-live="polite">
        {state?.success && !isPending ? (
          <p className="flex items-center gap-2 bg-candy-mint px-3 py-2 text-sm font-medium text-candy-mint-foreground"><CircleCheck className="size-4 shrink-0" />{state.message}</p>
        ) : null}
      </div>
      {state && !state.success ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </form>
  )
}
