"use client"
import Image from "next/image"
import Link from "next/link"
import { useActionState } from "react"
import { ArrowRight } from "lucide-react"
import { changeShopifyItem, checkoutShopify } from "@/app/actions/shopifyActions"
import { money, type ShopifyCart } from "@/lib/shopify/types"
import { candyToneAt, candyToneClasses } from "@/lib/candy"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Cart ID and checkout URL are deliberately excluded from the browser payload.
export default function ShopifyCartControls({ lines, subtotal }: { lines: ShopifyCart["lines"]["nodes"]; subtotal: ShopifyCart["cost"]["subtotalAmount"] }) {
  const [state, action, pending] = useActionState(changeShopifyItem, null)
  const [checkoutState, checkoutAction, checkingOut] = useActionState(checkoutShopify, null)
  const busy = pending || checkingOut
  return <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
    <div className="space-y-4">
      {lines.map((line, index) => <article key={line.id} className="flex gap-4 border bg-card p-4 sm:gap-5">
        <div className={cn("relative size-20 shrink-0 overflow-hidden sm:size-24", candyToneClasses[candyToneAt(index + 1)].surface)}>
          {line.merchandise.image && <Image src={line.merchandise.image.url} alt="" fill sizes="96px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Link href={`/products/${encodeURIComponent(line.merchandise.product.handle)}`} className="font-semibold hover:text-primary">{line.merchandise.product.title}</Link>
              {line.merchandise.title !== "Default Title" && <p className="text-sm text-muted-foreground">{line.merchandise.title}</p>}
              <p className="text-sm text-muted-foreground">{money(line.merchandise.price)} / 個</p>
            </div>
            <p className="shrink-0 text-lg font-semibold"><span className="mr-1.5 text-xs font-normal text-muted-foreground">合計</span>{money(line.cost.totalAmount)}</p>
          </div>
          {!line.merchandise.availableForSale && <p role="alert" className="text-sm text-destructive">この商品は現在購入できません。カートから削除してください。</p>}
          <form action={action} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="lineId" value={line.id} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">数量<Input key={line.quantity} name="quantity" type="number" min="1" max="99" step="1" defaultValue={line.quantity} required className="h-9 w-20 bg-background text-foreground" disabled={busy} /></label>
            <Button type="submit" name="operation" value="update" disabled={busy} variant="outline" className="h-9">更新</Button>
            <Button type="submit" name="operation" value="remove" disabled={busy} formNoValidate variant="ghost" className="h-9 text-muted-foreground">削除</Button>
          </form>
        </div>
      </article>)}
      {state && <p role={state.success ? "status" : "alert"} className={state.success ? "text-sm text-candy-mint-foreground" : "text-sm text-destructive"}>{state.message}</p>}
    </div>
    <div className="h-fit space-y-5 border bg-card p-6 shadow-xl shadow-primary/5 sm:p-7 lg:sticky lg:top-24">
      <h2 className="text-xl font-semibold">ご注文内容</h2>
      <div className="flex items-end justify-between"><span className="font-medium">小計</span><span className="text-2xl font-semibold text-primary">{money(subtotal)}</span></div>
      <p className="text-sm text-muted-foreground">送料・税金・割引を含む最終金額は購入手続きで確認できます。</p>
      <section aria-label="配送先とお支払い" className="space-y-3 bg-muted p-4 text-sm">
        <h3 className="font-semibold">配送先・お支払い方法を選択</h3>
        <p className="leading-6 text-muted-foreground">次のShopify購入画面でお届け先を入力できます。ログインすると登録済みの住所から選択できます。</p>
        <Link href="/account/address" className="inline-block font-medium text-primary underline-offset-4 hover:underline">登録済みの住所を管理</Link>
        <p className="leading-6 text-muted-foreground">お支払い方法は購入画面で選択します。カード情報はその画面で入力してください。</p>
        <Link href="/account/payment" className="inline-block font-medium text-primary underline-offset-4 hover:underline">お支払い方法について</Link>
      </section>
      <form action={checkoutAction}><Button type="submit" size="lg" className="h-11 w-full" disabled={busy || lines.some(line => !line.merchandise.availableForSale)}>{checkingOut ? "接続中…" : <>購入手続きへ <ArrowRight /></>}</Button></form>
      {checkoutState && <p role="alert" className="text-sm text-destructive">{checkoutState.message}</p>}
    </div>
  </div>
}
