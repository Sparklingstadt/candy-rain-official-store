import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import EmptyState from "@/app/components/EmptyState"

export const metadata: Metadata = { title: "商品が見つかりません" }

export default function NotFound() {
  return (
    <EmptyState icon={<SearchX />} title="商品が見つかりません" description="お探しの商品・バリエーションは存在しないか、URL が間違っている可能性があります。" tone="lavender" titleAs="h1">
      <Link href="/admin/products" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>商品一覧へ <ArrowRight /></Link>
    </EmptyState>
  )
}
