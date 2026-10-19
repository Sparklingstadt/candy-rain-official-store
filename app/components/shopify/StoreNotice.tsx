import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function StoreNotice({ unavailable = false }: { unavailable?: boolean }) {
  return <div className="space-y-4 border bg-card p-8" role={unavailable ? "alert" : "status"}>
    <h2 className="text-xl font-semibold">{unavailable ? "ストアに接続できません" : "商品はただいま準備中です"}</h2>
    <p className="text-muted-foreground">{unavailable ? "時間をおいて再度お試しください。" : "販売開始まで、もうしばらくお待ちください。"}</p>
    <Link href="/products" className={buttonVariants({ variant: "outline" })}>商品一覧を確認する</Link>
  </div>
}
