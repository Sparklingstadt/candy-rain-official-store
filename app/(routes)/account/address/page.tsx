import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, MapPin } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import ShippingAddress from "@/app/components/ShippingAddress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUserId } from "@/lib/auth"
import { getUserByUserId } from "@/services/storeQueryService"
import { UserRepository } from "@/repositories/implementations/userRepository"
import ShippingAddressForm from "./ShippingAddressForm"

export const metadata: Metadata = { title: "お届け先住所" }

export default async function Page(){
  const userId = await requireUserId()
  const user = await getUserByUserId(new UserRepository(), userId)
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> アカウントへ戻る</Link>
      <PageHeader eyebrow="Address book" tone="mint" title="お届け先住所" />
      <Card className=""><CardHeader><span className="flex size-11 items-center justify-center bg-candy-mint text-candy-mint-foreground"><MapPin className="size-5" /></span><CardTitle>既定のお届け先</CardTitle></CardHeader><CardContent><ShippingAddress user={user} /></CardContent></Card>
      <Card className=""><CardHeader><CardTitle>お届け先を編集</CardTitle><CardDescription>デモ環境のため、実在の住所は入力しないでください。</CardDescription></CardHeader><CardContent>
        <ShippingAddressForm address={{
          postalCode: user?.postalCode ?? "",
          prefecture: user?.prefecture ?? "",
          addressLine1: user?.addressLine1 ?? "",
          addressLine2: user?.addressLine2 ?? "",
        }} />
      </CardContent></Card>
    </div>
  )
}
