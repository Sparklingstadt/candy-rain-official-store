"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SignOut from "@/app/(routes)/account/SignOut"
import StoreLogo from "@/app/components/StoreLogo"

const navigation = [{ href: "/admin/orders", label: "注文" }]

export default function AdminHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <StoreLogo />
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">管理画面</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1" aria-label="管理メニュー">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(buttonVariants({ variant: "ghost" }), "px-3.5", active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground")}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <SignOut />
        </div>
      </div>
    </header>
  )
}
