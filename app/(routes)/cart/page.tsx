import type { Metadata } from "next"
import Link from "next/link"
import CartItemTable from "./CartItemTable"
import PlaceOrderButton from "./PlaceOrderButton"
import { requireUserId } from "@/lib/auth"
import { getCartByUserId, getCartItemsWithVariantsByCartId } from "@/services/storeQueryService"
import PriceSummary from "@/app/components/PriceSummary"
import { calculateCartQuantity, calculateCartSubtotal, SHIPPING_PRICE } from "@/services/checkout/orderPricing"
import { CartItemRepository } from "@/repositories/implementations/cartItemRepository"
import { CartRepository } from "@/repositories/implementations/cartRepository"
import { ArrowRight, ChevronLeft, ShoppingBag } from "lucide-react"
import { isStripeEnabled } from "@/lib/stripe"
import { UserRepository } from "@/repositories/implementations/userRepository"
import { listSavedCards } from "@/services/payment/paymentMethodService"
import { StripePaymentGateway } from "@/services/payment/stripePaymentGateway"
import { buttonVariants } from "@/components/ui/button"
import EmptyState from "@/app/components/EmptyState"
import PageHeader from "@/app/components/PageHeader"

export const metadata: Metadata = { title: "カート" }

export default async function Page(){
  const userId = await requireUserId()
  const cartRepo = new CartRepository()
  const cart = await getCartByUserId(cartRepo, userId)
  if(!cart) throw new Error("Cart not found")
  const repo = new CartItemRepository()
  const cartItems = await getCartItemsWithVariantsByCartId(repo, cart.id)
  const subTotalPrice = calculateCartSubtotal(cartItems)
  const totalPrice = subTotalPrice + SHIPPING_PRICE
  const totalQuantity = calculateCartQuantity(cartItems)
  const paymentEnabled = isStripeEnabled()
  const cards = paymentEnabled && cartItems.length > 0
    ? await listSavedCards(new StripePaymentGateway(), new UserRepository(), userId)
    : []

  return (
    <div className="space-y-8">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> 商品一覧へ戻る</Link>
      <PageHeader eyebrow="Your cart" title="買い物かご" tone="mint" description={cartItems.length > 0 ? `${cartItems.length}種類・合計${totalQuantity}点の商品が入っています。` : undefined} />
      {cartItems.length === 0 ? <EmptyState icon={<ShoppingBag />} title="カートの中は空です" description="お気に入りの商品を見つけて追加しましょう。">
          <Link href="/products" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>商品を見る <ArrowRight /></Link>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 bg-card px-5" })}>ホームへ戻る</Link>
        </EmptyState>
        : <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <CartItemTable cartItems={cartItems} />
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <PriceSummary title="ご注文内容" subTotalPrice={subTotalPrice} shippingPrice={SHIPPING_PRICE} totalPrice={totalPrice} />
            <PlaceOrderButton paymentEnabled={paymentEnabled} cards={cards} />
          </div>
        </div>}
    </div>
  )
}
