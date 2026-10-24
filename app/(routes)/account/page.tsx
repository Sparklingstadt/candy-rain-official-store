import type { Metadata } from "next"
import SignOut from "./SignOut";
import { requireUserId } from "@/lib/auth";
import { getOrders, getUserByUserId } from "@/services/storeQueryService";
import { OrderRepository } from "@/repositories/implementations/orderRepository";
import { UserRepository } from "@/repositories/implementations/userRepository";
import Link from "next/link";
import { ArrowRight, CreditCard, MapPin, Pencil, UserRound } from "lucide-react"
import OrderHistory from "@/app/components/OrderHistory"
import ShippingAddress, { hasShippingAddress } from "@/app/components/ShippingAddress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import CandyPill from "@/app/components/CandyPill"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "アカウント" }

const RECENT_ORDER_COUNT = 3

export default async function Page() {
  const userId = await requireUserId()
  // One extra row tells whether to link to the full order history.
  const [orders, user] = await Promise.all([
    getOrders(new OrderRepository(), userId, RECENT_ORDER_COUNT + 1),
    getUserByUserId(new UserRepository(), userId),
  ])

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><Avatar size="lg" className="ring-4 ring-candy-lavender"><AvatarFallback className="bg-candy-lavender text-candy-lavender-foreground">{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback></Avatar><div><CandyPill tone="lavender">Member</CandyPill><h1 className="mt-2 text-3xl font-semibold tracking-tight">{user?.firstName} {user?.lastName}</h1><p className="text-sm text-muted-foreground">Candy Rain Store のアカウント</p></div></div>
        <SignOut />
      </div>
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-2xl font-semibold">注文履歴</h2><p className="mt-1 text-sm text-muted-foreground">最近の注文と配送状況</p></div>
          {orders.length > RECENT_ORDER_COUNT && <Link href="/orders" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">すべての注文を見る <ArrowRight className="size-4" /></Link>}
        </div>
        <OrderHistory orders={orders.slice(0, RECENT_ORDER_COUNT)} />
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-mint text-candy-mint-foreground"><MapPin className="size-5" /></span><CardTitle>お届け先住所</CardTitle><CardDescription>既定のお届け先</CardDescription></CardHeader><CardContent><ShippingAddress user={user} /><Link href="/account/address" className={buttonVariants({ variant: "outline", className: "mt-4" })}><Pencil /> {hasShippingAddress(user) ? "お届け先を編集" : "お届け先を登録"}</Link></CardContent></Card>
        <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-pink text-candy-pink-foreground"><UserRound className="size-5" /></span><CardTitle>プロフィール</CardTitle><CardDescription>アカウント情報の確認</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">氏名を変更できます。</p><Link href="/account/edit" className={buttonVariants({ variant: "outline", className: "mt-4" })}><Pencil /> アカウント情報を編集</Link></CardContent></Card>
        <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-lavender text-candy-lavender-foreground"><CreditCard className="size-5" /></span><CardTitle>お支払い方法</CardTitle><CardDescription>注文時に使うカード</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">カードの追加・削除ができます。</p><Link href="/account/payment" className={buttonVariants({ variant: "outline", className: "mt-4" })}><CreditCard /> お支払い方法を管理</Link></CardContent></Card>
      </section>
    </div>
  )
}
