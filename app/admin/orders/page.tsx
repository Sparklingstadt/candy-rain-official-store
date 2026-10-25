import type { Metadata } from "next"
import PageHeader from "@/app/components/PageHeader"

export const metadata: Metadata = { title: "注文管理" }

export default function Page() {
  return <PageHeader eyebrow="Admin" title="注文管理" />
}
