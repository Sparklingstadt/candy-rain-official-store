"use client"
import { createCardSetupAction } from "@/app/actions/createCardSetupAction"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import type { Appearance } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CreditCard, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStripeClient } from "@/lib/stripeClient"

// Matches the square monochrome storefront.
const appearance: Appearance = {
  theme: "stripe",
  variables: { borderRadius: "0px", colorPrimary: "#0a0a0a", colorText: "#0a0a0a", colorDanger: "#0a0a0a" },
}

function CardSetupForm({ onSaved, onCancel }: { onSaved: (paymentMethodId: string) => void, onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements) return
    setIsPending(true)
    setErrorMessage(null)
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    })
    setIsPending(false)
    if (error) {
      setErrorMessage(error.message ?? "カードを保存できませんでした")
      return
    }
    const paymentMethod = setupIntent.payment_method
    onSaved(typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id ?? "")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never", link: "never" } }} />
      <p className="text-xs text-muted-foreground">Stripe のテストモードです。テストカード 4242 4242 4242 4242（有効期限は未来の日付、セキュリティコードは任意の3桁）を利用できます。実在のカードは使えません。</p>
      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!stripe || isPending}>{isPending && <LoaderCircle className="animate-spin" />}カードを保存</Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>キャンセル</Button>
      </div>
    </form>
  )
}

// Collects a card with Stripe Elements; card details go to Stripe, never to this server.
export default function AddCardForm({ onAdded }: { onAdded?: (paymentMethodId: string) => void }) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [message, setMessage] = useState<{ type: "status" | "alert", text: string } | null>(null)

  const handleStart = async () => {
    setIsStarting(true)
    setMessage(null)
    try {
      const result = await createCardSetupAction()
      if (result.success) setClientSecret(result.clientSecret)
      else setMessage({ type: "alert", text: result.message })
    } catch {
      setMessage({ type: "alert", text: "カードの登録を開始できませんでした。時間をおいてもう一度お試しください。" })
    } finally {
      setIsStarting(false)
    }
  }

  const handleSaved = (paymentMethodId: string) => {
    setClientSecret(null)
    setMessage({ type: "status", text: "カードを追加しました" })
    onAdded?.(paymentMethodId)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {clientSecret ? (
        <Elements stripe={getStripeClient()} options={{ clientSecret, appearance, locale: "ja" }}>
          <CardSetupForm onSaved={handleSaved} onCancel={() => setClientSecret(null)} />
        </Elements>
      ) : (
        <Button type="button" variant="outline" disabled={isStarting} onClick={handleStart}>
          {isStarting ? <LoaderCircle className="animate-spin" /> : <CreditCard />}カードを追加
        </Button>
      )}
      {message && <p role={message.type} className={message.type === "alert" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>}
    </div>
  )
}
