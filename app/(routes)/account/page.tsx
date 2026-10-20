import SignOut from "./SignOut";
import { requireUserId } from "@/lib/auth";
import { getOrders, getUserByUserId } from "@/services/storeQueryService";
import { OrderRepository } from "@/repositories/implementations/orderRepository";
import { UserRepository } from "@/repositories/implementations/userRepository";
import Link from "next/link";
import { MapPin, Pencil, UserRound } from "lucide-react"
import OrderHistory from "@/app/components/OrderHistory"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import CandyPill from "@/app/components/CandyPill"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function Page() {
  const userId = await requireUserId()
  const repo = new OrderRepository()
  const orders = await getOrders(repo, userId)
  const userRepo = new UserRepository()
  const user = await getUserByUserId(userRepo, userId)

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><Avatar size="lg" className="ring-4 ring-candy-lavender"><AvatarFallback className="bg-candy-lavender text-candy-lavender-foreground">{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback></Avatar><div><CandyPill tone="lavender">Member</CandyPill><h1 className="mt-2 text-3xl font-semibold tracking-tight">{user?.firstName} {user?.lastName}</h1><p className="text-sm text-muted-foreground">Candy Rain Store のアカウント</p></div></div>
        <SignOut />
      </div>
      <section className="space-y-4"><div><h2 className="text-2xl font-semibold">注文履歴</h2><p className="mt-1 text-sm text-muted-foreground">最近の注文と配送状況</p></div><OrderHistory orders={orders} /></section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-mint text-candy-mint-foreground"><MapPin className="size-5" /></span><CardTitle>お届け先住所</CardTitle><CardDescription>デモ用に登録された住所</CardDescription></CardHeader><CardContent className="space-y-1 leading-6"><p className="font-medium">{user?.firstName} {user?.lastName}</p><p className="text-muted-foreground">000-0000</p><p className="text-muted-foreground">XX県 YY市 ZZ丁目 A-B-C号室</p><Link href="/account/address" className={buttonVariants({ variant: "outline", className: "mt-4" })}>住所を見る(1)</Link></CardContent></Card>
        <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-pink text-candy-pink-foreground"><UserRound className="size-5" /></span><CardTitle>プロフィール</CardTitle><CardDescription>アカウント情報の確認</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">デモユーザーとしてサインインしています。</p><Link href="/account/edit" className={buttonVariants({ variant: "outline", className: "mt-4" })}><Pencil /> アカウント情報を編集</Link></CardContent></Card>
      </section>
    </div>
  )
}
