import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import CandyPill from "@/app/components/CandyPill"
import EmptyState from "@/app/components/EmptyState"

export const metadata: Metadata = { title: "ページが見つかりません" }

export default function NotFound() {
  return (
    <div className="space-y-6">
      <CandyPill tone="lavender">404 Not Found</CandyPill>
      <EmptyState icon={<SearchX />} title="ページが見つかりません" description="お探しのページは削除されたか、URL が間違っている可能性があります。" tone="lavender" titleAs="h1">
        <Link href="/products" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>商品一覧へ <ArrowRight /></Link>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 bg-card px-5" })}>ホームへ戻る</Link>
      </EmptyState>
    </div>
  )
}
