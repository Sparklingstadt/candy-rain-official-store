"use client"
import { removeCartItemAction } from "@/app/actions/removeCartItemAction"
import Image from "next/image"
import Link from "next/link"
import { getVariantImageUrl } from "@/lib/product-images"
import { isOnSale } from "@/lib/availability"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/format"
import { CartItemRow } from "./CartItemRow"
import { CartItemWithVariant } from "@/lib/types"
import { LoaderCircle, Trash2 } from "lucide-react"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function CartItemProduct({ cartItem, detail }: { cartItem: CartItemWithVariant; detail?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative size-14 shrink-0 overflow-hidden bg-candy-lemon">
        <Image src={getVariantImageUrl(cartItem.variant)} alt="" fill className="object-cover grayscale" sizes="56px" />
      </span>
      <div className="min-w-0">
        {isOnSale(cartItem.variant) ? (
          <Link href={`/products/${cartItem.variant.productId}`} className="font-medium underline-offset-4 hover:underline">{cartItem.variant.name}</Link>
        ) : (
          // The product page is no longer available, so show the name without a link.
          <span className="flex flex-wrap items-center gap-2 font-medium">{cartItem.variant.name}<Badge variant="destructive">販売停止</Badge></span>
        )}
        {detail}
      </div>
    </div>
  )
}

function RemoveCartItemButton({ variantId }: { variantId: number }) {
  const [isPending, startTransition] = useTransition()
  return (
    <Button variant="ghost" size="icon" disabled={isPending} onClick={() => startTransition(async () => { await removeCartItemAction({ variantId }) })}>
      {isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      <span className="sr-only">削除</span>
    </Button>
  )
}

export default function CartItemTable({ cartItems }: { cartItems: CartItemWithVariant[] }) {
  return (
    <>
      <Card className="hidden h-fit py-0 md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="p-4">商品名</TableHead><TableHead>価格</TableHead><TableHead>数量</TableHead><TableHead>削除</TableHead><TableHead className="text-right">合計</TableHead></TableRow></TableHeader>
          <TableBody>
            {cartItems.map(cartItem => (
              <TableRow key={cartItem.variantId}>
                <TableCell className="p-4"><CartItemProduct cartItem={cartItem} /></TableCell>
                <TableCell>{formatPrice(cartItem.variant.price)}</TableCell>
                <TableCell><CartItemRow cartItem={cartItem} /></TableCell>
                <TableCell><RemoveCartItemButton variantId={cartItem.variant.id} /></TableCell>
                <TableCell className="text-right font-semibold">{formatPrice(cartItem.quantity * cartItem.variant.price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-3 md:hidden">
        {cartItems.map(cartItem => (
          <Card key={cartItem.variantId}>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4"><CartItemProduct cartItem={cartItem} detail={<p className="mt-1 text-sm text-muted-foreground">{formatPrice(cartItem.variant.price)} / 個</p>} /><RemoveCartItemButton variantId={cartItem.variant.id} /></div>
              <div className="flex items-center justify-between"><CartItemRow cartItem={cartItem} /><p className="font-semibold">{formatPrice(cartItem.quantity * cartItem.variant.price)}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
