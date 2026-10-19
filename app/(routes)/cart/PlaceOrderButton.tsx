"use client"

import { placeOrderAction } from "@/app/actions/placeOrderAction"
import { useRouter } from "next/navigation"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
export default function PlaceOrderButton(){
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const handlePlaceOrder = async () => {
    setIsPending(true)
    setErrorMessage(null)
    try {
      const result = await placeOrderAction()
      if (!result.success) {
        setErrorMessage(result.message)
        return
      }
      router.push(`/orders/${result.orderId}?placed=1`)
    } catch {
      setErrorMessage("注文を確定できませんでした。時間をおいてもう一度お試しください。")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="h-11 w-full"
        disabled={isPending}
        onClick={handlePlaceOrder}
      >{isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}注文を確定する</Button>
      <p className="text-center text-xs text-muted-foreground">ボタンを押すと注文が確定します（デモのため決済は発生しません）</p>
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
