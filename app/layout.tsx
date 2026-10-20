import type { Metadata } from "next";
import "./globals.css";
import { getCartByUserId, getCartItemCount } from "@/services/storeQueryService";
import { auth } from "@/auth";
import { CartItemRepository } from "@/repositories/implementations/cartItemRepository";
import { CartRepository } from "@/repositories/implementations/cartRepository";
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
  const session = await auth()
  let cartItemCount = 0
  if(session?.user){
    const cart = await getCartByUserId(new CartRepository(), parseInt(session.user.id))
    if(!cart) throw new Error("Cart not found")
    cartItemCount = await getCartItemCount(new CartItemRepository(), cart.id)
  }

  return (
    <html lang="ja" className={cn("font-sans", geist.variable)}>
      <body className="flex flex-col">
        <StoreHeader cartItemCount={cartItemCount} signedIn={Boolean(session?.user)} />
        <main className="page-shell flex-1 py-8 sm:py-12">
          {children}
        </main>
        <StoreFooter />
      </body>
    </html>
  );
}
