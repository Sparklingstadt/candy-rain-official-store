import type { Metadata } from "next"
import Link from "next/link";
import { CheckCircle2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = { title: "サインアウトしました" }

export default async function Page(){
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <Card className="py-14"><CardContent><span className="mx-auto flex size-20 items-center justify-center bg-candy-mint text-candy-mint-foreground"><CheckCircle2 className="size-9" /></span><h1 className="mt-5 text-3xl font-semibold">サインアウトしました</h1><p className="mt-3 text-muted-foreground">Candy Rain Official Storeをご利用いただきありがとうございます。</p><Link href="/signin" className={buttonVariants({ className: "mt-7" })}>サインインページへ戻る</Link></CardContent></Card>
    </div>
  )
}
