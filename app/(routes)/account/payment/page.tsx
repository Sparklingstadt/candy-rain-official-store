import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, CreditCard } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import AddCardForm from "@/app/components/payment/AddCardForm"
import RemoveCardButton from "@/app/components/payment/RemoveCardButton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUserId } from "@/lib/auth"
import { formatCardExpiry, formatCardLabel } from "@/lib/cards"
import { isStripeEnabled } from "@/lib/stripe"
import { UserRepository } from "@/repositories/implementations/userRepository"
import { listSavedCards } from "@/services/payment/paymentMethodService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"

export const metadata: Metadata = { title: "お支払い方法" }

export default async function Page() {
  const userId = await requireUserId()
  const enabled = isStripeEnabled()
  const cards = enabled ? await listSavedCards(new StripePaymentGateway(), new UserRepository(), userId) : []

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> アカウントへ戻る</Link>
      <PageHeader eyebrow="Payment" tone="pink" title="お支払い方法" />
      <Card className="">
        <CardHeader><span className="flex size-11 items-center justify-center bg-candy-pink text-candy-pink-foreground"><CreditCard className="size-5" /></span><CardTitle>登録済みのカード</CardTitle><CardDescription>カード情報は Stripe が保管し、このストアには保存されません。</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          {!enabled ? (
            <p className="text-muted-foreground">このデモ環境ではカード決済が設定されていません。注文は決済なしで確定されます。</p>
          ) : (
            <>
              {cards.length === 0 ? <p className="text-muted-foreground">登録済みのカードはありません。</p> : (
                <ul className="divide-y border">
                  {cards.map(card => (
                    <li key={card.id} className="flex items-center justify-between gap-4 p-4">
                      <div><p className="font-medium">{formatCardLabel(card)}</p><p className="text-sm text-muted-foreground">有効期限 {formatCardExpiry(card)}</p></div>
                      <RemoveCardButton paymentMethodId={card.id} label={formatCardLabel(card)} />
                    </li>
                  ))}
                </ul>
              )}
              <AddCardForm />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
