import Link from "next/link"
import { ArrowRight, CreditCard, ExternalLink, Info, MapPin, UserRound } from "lucide-react"
import { customerAccountUrl } from "@/lib/shopify/account"
import { candyToneClasses, type CandyTone } from "@/lib/candy"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import PageHeader from "@/app/components/PageHeader"

const sections: { href: string; title: string; description: string; label: string; Icon: typeof UserRound; tone: CandyTone }[] = [
  { href: "/account/edit", title: "プロフィール", description: "氏名・メールアドレスを確認、変更します。", label: "アカウント情報を編集", Icon: UserRound, tone: "pink" },
  { href: "/account/address", title: "お届け先住所", description: "郵便番号を含む住所を追加・編集し、既定の住所を設定します。", label: "住所を管理", Icon: MapPin, tone: "mint" },
  { href: "/account/payment", title: "お支払い方法", description: "購入時の支払い方法とカード情報の入力について確認できます。", label: "お支払い方法を確認", Icon: CreditCard, tone: "lemon" },
]

export default function ShopifyAccount() {
  return <div className="space-y-8">
    <PageHeader
      eyebrow="Account"
      tone="lavender"
      title="アカウント・注文履歴"
      description="購入時のメールアドレスでShopifyのお客様アカウントにログインすると、登録情報と注文を管理できます。"
      actions={<a href={customerAccountUrl()} className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>アカウント画面へ <ExternalLink /></a>}
    />
    <section aria-label="アカウントの管理" className="grid gap-4 md:grid-cols-3 md:gap-6">
      {sections.map(({ href, title, description, label, Icon, tone }) => <div key={href} className="flex flex-col gap-3 border bg-card p-6 sm:p-7">
        <span className={cn("flex size-11 items-center justify-center [&>svg]:size-5", candyToneClasses[tone].surface, candyToneClasses[tone].text)}><Icon aria-hidden="true" /></span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="flex-1 text-sm leading-7 text-muted-foreground">{description}</p>
        <Link href={href} className={buttonVariants({ variant: "outline", className: "w-fit bg-card" })}>{label} <ArrowRight /></Link>
      </div>)}
    </section>
    <p className="flex items-start gap-2.5 bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground"><Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-candy-lavender-foreground" />住所の変更は次回のお買い物に使用されます。注文済みのお届け先変更は、注文履歴からストアへお問い合わせください。</p>
  </div>
}
