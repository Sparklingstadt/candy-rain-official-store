"use client"
import { removeCartItem } from "@/app/actions/actions"
import Image from "next/image"
import Link from "next/link"
import { getVariantImageUrl } from "@/lib/product-images"
import { CartItemRow } from "./CartItemRow"
import { CartItemWithVariant } from "@/lib/types"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function CartItemProduct({ cartItem, detail }: { cartItem: CartItemWithVariant; detail?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative size-14 shrink-0 overflow-hidden bg-candy-lemon">
        <Image src={getVariantImageUrl(cartItem.variant)} alt="" fill className="object-cover" sizes="56px" />
      </span>
      <div className="min-w-0">
        <Link href={`/products/${cartItem.variant.productId}`} className="font-medium underline-offset-4 hover:underline">{cartItem.variant.name}</Link>
        {detail}
      </div>
    </div>
  )
}

export default function CartItemTable({ cartItems }: { cartItems: CartItemWithVariant[] }) {
  const handleRemoveCartItem = async (variantId: number) => {
    await removeCartItem({ variantId })
  }
  
  return (
    <>
      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="p-4">商品名</TableHead><TableHead>価格</TableHead><TableHead>数量</TableHead><TableHead>削除</TableHead><TableHead className="text-right">合計</TableHead></TableRow></TableHeader>
          <TableBody>
            {cartItems.map(cartItem => (
              <TableRow key={cartItem.variantId}>
                <TableCell className="p-4"><CartItemProduct cartItem={cartItem} /></TableCell>
                <TableCell>¥{cartItem.variant.price.toLocaleString()}</TableCell>
                <TableCell><CartItemRow cartItem={cartItem} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveCartItem(cartItem.variant.id)}><Trash2 /><span className="sr-only">削除</span></Button></TableCell>
                <TableCell className="text-right font-semibold">¥{(cartItem.quantity * cartItem.variant.price).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-3 md:hidden">
        {cartItems.map(cartItem => (
          <Card key={cartItem.variantId}>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4"><CartItemProduct cartItem={cartItem} detail={<p className="mt-1 text-sm text-muted-foreground">¥{cartItem.variant.price.toLocaleString()} / 個</p>} /><Button variant="ghost" size="icon" onClick={() => handleRemoveCartItem(cartItem.variant.id)}><Trash2 /><span className="sr-only">削除</span></Button></div>
              <div className="flex items-center justify-between"><CartItemRow cartItem={cartItem} /><p className="font-semibold">¥{(cartItem.quantity * cartItem.variant.price).toLocaleString()}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
