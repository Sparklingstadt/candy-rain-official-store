"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Code2, Menu, ShoppingBag } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import StoreLogo from "./StoreLogo"

const navigation = [
  { href: "/products", label: "商品一覧" },
  { href: "/orders", label: "注文履歴" },
  { href: "/account", label: "アカウント" },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function CartCount({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className={cn("flex h-5 min-w-5 items-center justify-center px-1.5 text-[11px] font-bold", count > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
      {count}
    </span>
  )
}

export default function StoreHeader({ cartItemCount, signedIn }: { cartItemCount: number, signedIn: boolean }) {
  const pathname = usePathname()
  const cartLabel = `カート(${cartItemCount})`

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between">
        <Link href="/" className="focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <StoreLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="メインナビゲーション">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href)
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
          <Link
            href="/cart"
            aria-label={cartLabel}
            aria-current={isActive(pathname, "/cart") ? "page" : undefined}
            className={cn(buttonVariants({ variant: "outline" }), "ml-2 gap-2 bg-card pr-1.5 pl-3.5")}
          >
            <ShoppingBag data-icon="inline-start" />
            カート
            <CartCount count={cartItemCount} />
          </Link>
          <a href="https://github.com/Sparklingstadt/prd-candy-rain-store" target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground")}>
            <Code2 />
            <span className="sr-only">GitHub</span>
          </a>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/cart"
            aria-label={cartLabel}
            className={cn(buttonVariants({ variant: "outline" }), "gap-1.5 bg-card pr-1.5 pl-2.5")}
          >
            <ShoppingBag />
            <CartCount count={cartItemCount} />
          </Link>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" className="bg-card" />}>
              <Menu />
              <span className="sr-only">メニューを開く</span>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Candy Rain Store</SheetTitle>
                <SheetDescription>{signedIn ? "サインイン中" : "ゲスト"} ・ ストアメニュー</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-4" aria-label="モバイルナビゲーション">
                {navigation.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(buttonVariants({ variant: "ghost" }), "justify-start", active && "bg-muted font-semibold")}
                    >
                      {item.label}
                    </Link>
                  )
                })}
                <Link href="/cart" className={cn(buttonVariants({ variant: "secondary" }), "justify-start")}>
                  <ShoppingBag data-icon="inline-start" />
                  {cartLabel}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
