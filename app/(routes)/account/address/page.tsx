import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, MapPin } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUserId } from "@/lib/auth"
import { getUserByUserId } from "@/services/storeQueryService"
import { UserRepository } from "@/repositories/implementations/userRepository"

export const metadata: Metadata = { title: "お届け先住所" }

export default async function Page(){
  const userId = await requireUserId()
  const user = await getUserByUserId(new UserRepository(), userId)
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> アカウントへ戻る</Link>
      <PageHeader eyebrow="Address book" tone="mint" title="設定住所" />
      <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-mint text-candy-mint-foreground"><MapPin className="size-5" /></span><CardTitle>既定のお届け先</CardTitle></CardHeader><CardContent className="space-y-1 leading-7"><p className="font-medium">{user?.firstName} {user?.lastName}</p><p className="text-muted-foreground">000-0000</p><p className="text-muted-foreground">XX県 YY市 ZZ丁目</p><p className="text-muted-foreground">A-B-C号室</p></CardContent></Card>
    </div>
  )
}
