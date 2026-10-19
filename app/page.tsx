import { isShopifyEnabled } from "@/lib/shopify/config"
import { getShopifyProducts } from "@/lib/shopify/catalog"
import { getProductsWithVariants } from "@/services/storeQueryService"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Boxes, PackageCheck, ShieldCheck, Sparkles, UserRound } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { candyToneAt, candyToneClasses, type CandyTone } from "@/lib/candy"
import { cn } from "@/lib/utils"
import CandyPill from "@/app/components/CandyPill"
import ProductCard from "@/app/components/ProductCard"
import { fromDemoProduct, fromShopifyProduct, type ProductSummary } from "@/app/components/productSummaries"

// The home page stays usable when the catalog is unavailable; /products shows the retry message.
async function getPickupProducts(shopify: boolean): Promise<ProductSummary[]> {
  try {
    if (shopify) return (await getShopifyProducts()).nodes.slice(0, 4).map(fromShopifyProduct)
    return (await getProductsWithVariants(new ProductRepository())).slice(0, 4).map(fromDemoProduct)
  } catch {
    return []
  }
}

const shopifyFeatures = [
  { title: "安心のお支払い", description: "決済は Shopify Checkout が担当します。送料・税金もチェックアウト画面で確認できます。", Icon: ShieldCheck },
  { title: "ゲストでもOK", description: "アカウントがなくても、カートに追加して購入手続きへ進めます。", Icon: UserRound },
  { title: "在庫をしっかり確認", description: "購入手続きの直前にカートを取り直し、売り切れや在庫不足をお知らせします。", Icon: PackageCheck },
]

const demoFeatures = [
  { title: "フルスタック設計", description: "Next.js、Prisma、PostgreSQLで購入フローをレイヤーごとに実装しています。", Icon: Boxes },
  { title: "自動品質確認", description: "単体・DB統合・Playwright E2EをGitHub Actionsで継続的に確認します。", Icon: ShieldCheck },
  { title: "正常系に集中", description: "学習用デモとして、迷いのないシンプルな購入体験を優先しています。", Icon: Sparkles },
]

function CollageTile({ product, tone, className }: { product?: ProductSummary; tone: CandyTone; className: string }) {
  return (
    <div className={cn("relative overflow-hidden", candyToneClasses[tone].surface, className)}>
      {product?.image
        ? <Image src={product.image.src} alt="" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover grayscale" loading="eager" />
        : <span className={cn("absolute left-1/2 top-1/2 size-1/3 -translate-1/2 opacity-70", candyToneClasses[tone].strong)} />}
      {product && <span className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] bg-card/90 px-3 py-2 text-xs">
        <span className="block truncate font-medium">{product.name}</span>
        <span className="block font-semibold text-primary">{product.price}</span>
      </span>}
    </div>
  )
}

export default async function Page(){
  const shopify = isShopifyEnabled()
  const pickup = await getPickupProducts(shopify)
  const features = shopify ? shopifyFeatures : demoFeatures
  const perks = shopify
    ? ["ゲストでもカートOK", "Shopify Checkout", "購入前に在庫を再確認"]
    : ["Next.js × Prisma", "在庫をトランザクションで管理", "E2E で継続検証"]

  return (
    <div className="space-y-24">
      <section className="grid items-center gap-12 py-4 lg:grid-cols-[1.05fr_.95fr] lg:py-10">
        <div className="space-y-7">
          <CandyPill>{shopify ? "Candy Rain Store" : "Full-stack demo store"}</CandyPill>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.2] tracking-[-0.04em] sm:text-6xl lg:text-5xl xl:text-6xl"><span className="whitespace-nowrap">小さなときめきを、</span><br /><span className="whitespace-nowrap">ひと箱に。</span></h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">{shopify ? "毎日に小さな彩りを添える、Candy Rain Storeのオリジナルグッズをお届けします。" : "Candy Rain Storeは、商品選びから注文履歴までのEC購入体験を実装したデモストアです。"}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>商品を見る <ArrowRight /></Link>
            {pickup.length > 0
              ? <Link href="#pickup" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 bg-card px-5" })}>ピックアップを見る</Link>
              : <Link href="/account" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 bg-card px-5" })}>アカウント</Link>}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {perks.map((perk, index) => (
              <li key={perk} className="flex items-center gap-2"><span aria-hidden="true" className={cn("size-2", candyToneClasses[candyToneAt(index + 1)].strong)} />{perk}</li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true" className="relative">
          <span className="absolute -left-3 top-2 size-4 bg-candy-pink-strong" />
          <span className="absolute -top-2 right-1/2 size-3 bg-candy-lemon-strong" />
          <span className="absolute -right-2 top-1/2 size-5 bg-candy-mint-strong" />
          <span className="absolute -bottom-2 left-1/2 size-2.5 bg-candy-lavender-strong" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4 pt-6">
              <CollageTile product={pickup[0]} tone="pink" className="aspect-[3/4]" />
              <div className="hidden bg-candy-lavender p-6 sm:block">
                <span className="flex gap-1.5"><span className="size-2.5 bg-candy-pink-strong" /><span className="size-2.5 bg-candy-mint-strong" /><span className="size-2.5 bg-candy-lemon-strong" /></span>
                <p className="mt-3 text-xl font-semibold leading-snug text-candy-lavender-foreground">毎日に、<br />小さな彩りを。</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <CollageTile product={pickup[1]} tone="lemon" className="aspect-[8/7]" />
              <CollageTile product={pickup[2]} tone="mint" className="aspect-square" />
            </div>
          </div>
        </div>
      </section>

      {pickup.length > 0 && <section id="pickup" aria-labelledby="pickup-heading" className="scroll-mt-24 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-bold tracking-[0.2em] text-primary">PICK UP</p>
            <h2 id="pickup-heading" className="text-3xl font-semibold tracking-tight">ピックアップ</h2>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">すべて見る <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {pickup.map((product, index) => <ProductCard key={product.key} product={product} tone={candyToneAt(index + 1)} headingLevel="h3" sizes="(max-width: 1024px) 50vw, 25vw" />)}
        </div>
      </section>}

      <section aria-label="Candy Rain Storeの特長" className="grid gap-4 md:grid-cols-3 md:gap-6">
        {features.map(({ title, description, Icon }, index) => {
          const tone = candyToneClasses[candyToneAt(index)]
          return (
            <div key={title} className="space-y-3 border bg-card p-6 sm:p-7">
              <span className={cn("flex size-11 items-center justify-center [&>svg]:size-5", tone.surface, tone.text)}><Icon aria-hidden="true" /></span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          )
        })}
      </section>
    </div>
  )
}
