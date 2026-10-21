import type { Metadata } from "next"
import { SignInForm } from "@/app/(routes)/signin/SignInForm"
import CandyPill from "@/app/components/CandyPill"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "サインイン" }

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const hasCredentialsError = (await searchParams).error === "credentials"

  return (
    <Card className="shadow-xl shadow-primary/5">
      <CardHeader className="space-y-3">
        <CandyPill>Demo account</CandyPill>
        <CardTitle className="text-2xl">おかえりなさい</CardTitle>
        <CardDescription>デモアカウントでストアへサインインします。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasCredentialsError && (
          <p role="alert" className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            メールアドレスまたはパスワードが正しくありません。
          </p>
        )}
        <SignInForm />
        <div className="bg-muted p-4 text-sm">
          <p className="font-medium">入力例</p>
          <p className="mt-2 text-muted-foreground">メールアドレス: user1@mail.com</p>
          <p className="text-muted-foreground">パスワード: demo-password</p>
        </div>
      </CardContent>
    </Card>
  )
}
