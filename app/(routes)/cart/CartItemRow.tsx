import { updateCartItemQuantityAction } from "@/app/actions/updateCartItemQuantityAction"
import { useActionState } from "react"
import { CartItemWithVariant } from "@/lib/types"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_CART_QUANTITY } from "@/lib/validation"

export function CartItemRow({ cartItem }: { cartItem: CartItemWithVariant }) {
  const [state, formAction, isPending] = useActionState(updateCartItemQuantityAction, null)
  const reachedStockLimit = cartItem.quantity >= cartItem.variant.stock

  return (
    <div className="space-y-1">
      <form action={formAction} className="flex w-fit items-center border bg-background p-0.5">
        <input type="hidden" name="cartItemId" value={cartItem.id} />
        <Button
          type="submit"
          name="type"
          value="decrement"
          disabled={isPending || cartItem.quantity <= 1}
          variant="ghost"
          size="icon-sm"
        >
          <Minus />
          <span className="sr-only">数量を減らす</span>
        </Button>
        <p className="flex h-7 w-9 items-center justify-center text-sm font-medium">{cartItem.quantity}</p>
        <Button
          type="submit"
          name="type"
          value="increment"
          disabled={isPending || cartItem.quantity >= MAX_CART_QUANTITY || reachedStockLimit}
          variant="ghost"
          size="icon-sm"
        >
          <Plus />
          <span className="sr-only">数量を増やす</span>
        </Button>
      </form>
      {reachedStockLimit ? (
        <p className="text-xs text-muted-foreground">
          {cartItem.variant.stock <= 0 ? "在庫切れ" : "在庫上限"}
        </p>
      ) : null}
      {state && !state.success ? (
        <p role="alert" className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </div>
  )
}
