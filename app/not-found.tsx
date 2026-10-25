import type { Metadata } from "next"
import StoreShell from "@/app/components/StoreShell"
import NotFoundContent from "@/app/components/NotFoundContent"

export const metadata: Metadata = { title: "ページが見つかりません" }

export default function NotFound() {
  return (
    <StoreShell>
      <NotFoundContent />
    </StoreShell>
  )
}
