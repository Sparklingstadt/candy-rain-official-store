import { getCartByUserId, getCartItemCount } from "@/services/storeQueryService"
import { auth } from "@/auth"
import { CartItemRepository } from "@/repositories/implementations/cartItemRepository"
import { CartRepository } from "@/repositories/implementations/cartRepository"
import StoreHeader from "@/app/components/StoreHeader"
import StoreFooter from "@/app/components/StoreFooter"

export default async function StoreShell({ children }: { children: React.ReactNode }) {
  const session = await auth()
  let cartItemCount = 0
  if(session?.user){
    // カートを持たないユーザー（管理者など）が未定義 URL を開いても落とさず、件数 0 にする。
    const cart = await getCartByUserId(new CartRepository(), parseInt(session.user.id))
    if(cart) cartItemCount = await getCartItemCount(new CartItemRepository(), cart.id)
  }

  return (
    <>
      <StoreHeader cartItemCount={cartItemCount} signedIn={Boolean(session?.user)} />
      <main className="page-shell flex-1 py-8 sm:py-12">
        {children}
      </main>
      <StoreFooter />
    </>
  )
}
