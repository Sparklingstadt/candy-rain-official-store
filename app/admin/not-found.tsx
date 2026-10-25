import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import EmptyState from "@/app/components/EmptyState"

export const metadata: Metadata = { title: "注文が見つかりません" }

export default function NotFound() {
  return (
    <EmptyState icon={<SearchX />} title="注文が見つかりません" description="お探しの注文は存在しないか、URL が間違っている可能性があります。" tone="lavender" titleAs="h1">
      <Link href="/admin/orders" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>注文一覧へ <ArrowRight /></Link>
    </EmptyState>
  )
}
