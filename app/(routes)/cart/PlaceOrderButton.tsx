"use client"

import { completeOrderAction } from "@/app/actions/completeOrderAction"
import { placeOrderAction } from "@/app/actions/placeOrderAction"
import AddCardForm from "@/app/components/payment/AddCardForm"
import { useRouter } from "next/navigation"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCardExpiry, formatCardLabel, type SavedCard } from "@/lib/cards"
import { getStripeClient } from "@/lib/stripeClient"
import { useState } from "react"

const GENERIC_ERROR = "注文を確定できませんでした。時間をおいてもう一度お試しください。"

// Runs 3D Secure in the browser, then lets the server save the order and capture the payment.
async function authenticateAndComplete(paymentIntentId: string, clientSecret: string) {
  const stripe = await getStripeClient()
  if (!stripe) return { success: false as const, message: GENERIC_ERROR }
  const { error } = await stripe.handleNextAction({ clientSecret })
  if (error) return { success: false as const, message: error.message ?? "カードの認証が完了しませんでした" }
  return completeOrderAction({ paymentIntentId })
}

export default function PlaceOrderButton({ paymentEnabled, cards }: {
  paymentEnabled: boolean
  cards: SavedCard[]
}){
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cards[0]?.id ?? null)
  // A card removed in another tab disappears from the list; fall back to the first one.
  const paymentMethodId = cards.some(card => card.id === selectedCardId) ? selectedCardId : cards[0]?.id ?? null
  const canPlaceOrder = !paymentEnabled || paymentMethodId !== null

  const handlePlaceOrder = async () => {
    setIsPending(true)
    setErrorMessage(null)
    try {
      let result = await placeOrderAction(paymentEnabled ? { paymentMethodId } : undefined)
      if (result.success && "clientSecret" in result) {
        result = await authenticateAndComplete(result.paymentIntentId, result.clientSecret)
      }
      if (!result.success) {
        setErrorMessage(result.message)
        return
      }
      if ("orderId" in result) router.push(`/orders/${result.orderId}?placed=1`)
    } catch {
      setErrorMessage(GENERIC_ERROR)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-4">
      {paymentEnabled && (
        <fieldset className="space-y-3 border bg-card p-5" disabled={isPending}>
          <legend className="px-1 text-sm font-semibold">お支払い方法</legend>
          {cards.length === 0 ? <p className="text-sm text-muted-foreground">注文にはカードの登録が必要です。</p> : (
            <div className="space-y-2">
              {cards.map(card => (
                <label key={card.id} className="flex cursor-pointer items-center gap-3 border p-3 text-sm has-checked:border-primary">
                  <input type="radio" name="paymentMethodId" value={card.id} checked={paymentMethodId === card.id} onChange={() => setSelectedCardId(card.id)} className="accent-primary" />
                  <span className="font-medium">{formatCardLabel(card)}</span>
                  <span className="ml-auto text-muted-foreground">{formatCardExpiry(card)}</span>
                </label>
              ))}
            </div>
          )}
          <AddCardForm onAdded={setSelectedCardId} />
        </fieldset>
      )}
      <div className="space-y-3">
        <Button
          size="lg"
          className="h-11 w-full"
          disabled={isPending || !canPlaceOrder}
          onClick={handlePlaceOrder}
        >{isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}注文を確定する</Button>
        <p className="text-center text-xs text-muted-foreground">{paymentEnabled
          ? "ボタンを押すと選択したカードで決済し、注文が確定します（Stripe のテストモードのため実際の請求は発生しません）"
          : "ボタンを押すと注文が確定します（デモのため決済は発生しません）"}</p>
        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
