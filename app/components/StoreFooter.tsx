import Link from "next/link"
import StoreLogo from "./StoreLogo"

const columns = [
  { title: "Shop", links: [{ href: "/products", label: "商品一覧" }, { href: "/cart", label: "カート" }] },
  { title: "Account", links: [{ href: "/account", label: "アカウント" }, { href: "/orders", label: "注文履歴" }] },
]

export default function StoreFooter() {
  return (
    <footer className="mt-16 border-t bg-card/60">
      <div className="page-shell space-y-10 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
          <div className="max-w-xs space-y-3">
            <StoreLogo />
            <p className="font-medium">小さなときめきを、ひと箱に。</p>
            <p className="text-sm leading-6 text-muted-foreground">正常系の購入体験を検証するデモストア</p>
          </div>
          <div className="flex gap-16">
            {columns.map(column => (
              <nav key={column.title} aria-label={`${column.title}リンク`} className="space-y-3">
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{column.title}</p>
                <ul className="space-y-2 text-sm">
                  {column.links.map(link => <li key={link.href}><Link href={link.href} className="hover:text-primary">{link.label}</Link></li>)}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Candy Rain Store</p>
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-1.5 bg-candy-pink-strong" />
            <span className="size-1.5 bg-candy-mint-strong" />
            <span className="size-1.5 bg-candy-lemon-strong" />
            <span className="size-1.5 bg-candy-lavender-strong" />
          </span>
        </div>
      </div>
    </footer>
  )
}
