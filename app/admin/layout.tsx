import type { Metadata } from "next"
import { requireAdmin } from "@/lib/auth"
import AdminHeader from "@/app/admin/components/AdminHeader"

export const metadata: Metadata = {
  title: { template: "%s | 管理画面 | Candy Rain Store", default: "管理画面 | Candy Rain Store" },
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireAdmin()

  return (
    <>
      <AdminHeader />
      <main className="page-shell flex-1 py-8 sm:py-12">
        {children}
      </main>
    </>
  )
}
