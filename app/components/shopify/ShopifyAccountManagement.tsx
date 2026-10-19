import Link from "next/link"
import { customerAccountUrl } from "@/lib/shopify/account"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"

const content = {
  profile: { title: "プロフィールを編集", description: "氏名とメールアドレスは、Shopifyのお客様アカウントで変更できます。", steps: ["購入時のメールアドレスでログインします。", "プロフィールの氏名またはメールアドレスの編集ボタンを選びます。", "変更内容を入力して保存します。"], label: "Shopifyでプロフィールを編集" },
  addresses: { title: "お届け先住所を管理", description: "お届け先を複数登録し、郵便番号・住所・宛名を編集できます。", steps: ["購入時のメールアドレスでログインします。", "プロフィールの住所欄で追加・編集・削除、既定の住所の設定を行います。", "購入手続きでも同じアカウントにログインし、今回のお届け先を選択します。別の住所を入力することもできます。"], label: "Shopifyで住所を管理" },
}

export default function ShopifyAccountManagement({ section }: { section: keyof typeof content | "payment" }) {
  const payment = section === "payment"
  const details = payment ? null : content[section]
  return <div className="mx-auto max-w-2xl space-y-8">
    <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> アカウントへ戻る</Link>
    <PageHeader eyebrow="Account" tone="lavender" title={details?.title ?? "お支払い方法"} />
    <Card className=""><CardHeader><CardTitle>{payment ? "購入手続きで選択" : "登録情報の管理"}</CardTitle></CardHeader><CardContent className="space-y-5">
      {details ? <>
        <p>{details.description}</p>
        <ol className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-primary">{details.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <a href={customerAccountUrl(section as "profile" | "addresses")} className={buttonVariants()}>{details.label}</a>
      </> : <>
        <p>カートから購入手続きへ進み、「お支払い」で利用可能な方法を選択してください。利用できる方法はストア・配送先・通貨によって異なります。</p>
        <p>カード番号・有効期限・セキュリティコードはShopifyの購入画面で入力します。このサイトには保存しません。別のカードを使う場合は、購入時に入力し直してください。</p>
        <p className="text-sm text-muted-foreground">保存済みカードの追加・選択・削除は、Shop Payなど対応するサービスを利用できる場合に、そのサービス側で行います。このストアのアカウント画面で複数カードを保存できるとは限りません。</p>
        <Link href="/cart" className={buttonVariants()}>カートから購入手続きへ</Link>
      </>}
    </CardContent></Card>
  </div>
}
