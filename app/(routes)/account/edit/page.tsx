import type { Metadata } from "next"
import Link from "next/link";
import { ChevronLeft } from "lucide-react"
import PageHeader from "@/app/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const metadata: Metadata = { title: "アカウント情報を編集" }

export default function Page(){
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> アカウントへ戻る</Link>
      <PageHeader eyebrow="Profile" tone="lavender" title="アカウント情報を編集" />
      <Card className=""><CardHeader><CardTitle>プロフィール</CardTitle><CardDescription>この画面はUIデモです。保存機能は今後の拡張対象です。</CardDescription></CardHeader><CardContent><form className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="firstName">名</Label><Input id="firstName" defaultValue="Taro" /></div><div className="space-y-2"><Label htmlFor="lastName">姓</Label><Input id="lastName" defaultValue="Yamada" /></div><div className="sm:col-span-2"><Button type="button" disabled className="w-full sm:w-auto">変更を保存</Button></div></form></CardContent></Card>
    </div>
  )
}
