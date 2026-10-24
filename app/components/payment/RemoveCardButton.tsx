"use client"
import { removeCardAction } from "@/app/actions/removeCardAction"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LoaderCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RemoveCardButton({ paymentMethodId, label }: { paymentMethodId: string, label: string }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleRemove = async () => {
    setIsPending(true)
    setErrorMessage(null)
    try {
      await removeCardAction({ paymentMethodId })
      router.refresh()
    } catch {
      setErrorMessage("カードを削除できませんでした")
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove} aria-label={`${label} を削除`}>
        {isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}削除
      </Button>
      {errorMessage && <p role="alert" className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}
