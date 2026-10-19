import { isShopifyEnabled } from "@/lib/shopify/config"
import { getShopifyCart } from "@/lib/shopify/cart"
import type { Metadata } from "next";
import "./globals.css";
import { getCartByUserId } from "@/services/storeQueryService";
import { auth } from "@/auth";
import { cartItemRepository } from "@/repositories/implementations/cartItemRepository";
import { cartRepository } from "@/repositories/implementations/cartRepository";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import StoreHeader from "@/app/components/StoreHeader";
import StoreFooter from "@/app/components/StoreFooter";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Candy Rain Store",
  description: "EC Shopping app developed with Next.js v16",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shopify = isShopifyEnabled()
  const session = shopify ? null : await auth()
  let cartItemCount = 0
  if (shopify) {
    try { cartItemCount = (await getShopifyCart())?.totalQuantity ?? 0 } catch { /* Cart page provides a retry message. */ }
  }
  if(session?.user){
    const cartRepo = new cartRepository()
    const cart = await getCartByUserId(cartRepo, parseInt(session.user.id))
    if(!cart) throw new Error("Cart not found")
    const repo = new cartItemRepository()
    const cartItems = await repo.findManyByCartId(cart.id)
    cartItemCount = cartItems.length
  }

  return (
    <html lang="ja" className={cn("font-sans", geist.variable)}>
      <body className="flex flex-col">
        <StoreHeader cartItemCount={cartItemCount} signedIn={Boolean(session?.user)} />
        <main className="page-shell flex-1 py-8 sm:py-12">
          {children}
        </main>
        <StoreFooter shopify={shopify} />
      </body>
    </html>
  );
}
