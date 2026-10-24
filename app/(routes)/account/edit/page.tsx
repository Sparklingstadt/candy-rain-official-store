import type { Metadata } from "next"
import Link from "next/link";
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUserId } from "@/lib/auth"
import { getUserByUserId } from "@/services/storeQueryService"
import { UserRepository } from "@/repositories/implementations/userRepository"
import ProfileForm from "./ProfileForm"

export const metadata: Metadata = { title: "アカウント情報を編集" }

export default async function Page(){
  const userId = await requireUserId()
  const user = await getUserByUserId(new UserRepository(), userId)
  if (!user) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> アカウントへ戻る</Link>
      <PageHeader eyebrow="Profile" tone="lavender" title="アカウント情報を編集" />
      <Card className=""><CardHeader><CardTitle>プロフィール</CardTitle><CardDescription>お届け先の宛名にも使われます。デモ環境のため、実在の個人情報は入力しないでください。</CardDescription></CardHeader><CardContent><ProfileForm profile={{ firstName: user.firstName, lastName: user.lastName }} /></CardContent></Card>
    </div>
  )
}
