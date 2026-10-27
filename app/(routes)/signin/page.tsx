import type { Metadata } from "next"
import { CandyRainIdSignIn } from "@/app/(routes)/signin/CandyRainIdSignIn"
import { candyRainIdProviderId } from "@/auth"
import CandyPill from "@/app/components/CandyPill"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "サインイン" }

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Auth.js sends failed sign-ins back here with ?error=<type>.
  const hasError = Boolean((await searchParams).error)

  return (
    <Card className="shadow-xl shadow-primary/5">
      <CardHeader className="space-y-3">
        <CandyPill>Demo account</CandyPill>
        <CardTitle className="text-2xl">おかえりなさい</CardTitle>
        <CardDescription>Candy Rain ID でストアへサインインします。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasError && (
          <p role="alert" className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            サインインできませんでした。もう一度お試しください。
          </p>
        )}
        <CandyRainIdSignIn providerId={candyRainIdProviderId} />
        <div className="bg-muted p-4 text-sm">
          <p className="font-medium">デモアカウント</p>
          <p className="mt-2 text-muted-foreground">メールアドレス: user1@mail.com</p>
          <p className="text-muted-foreground">パスワード: demo-password</p>
        </div>
      </CardContent>
    </Card>
  )
}
