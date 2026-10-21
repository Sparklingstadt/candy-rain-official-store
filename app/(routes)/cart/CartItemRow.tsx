import { updateCartItemQuantityAction } from "@/app/actions/updateCartItemQuantityAction"
import { useActionState } from "react"
import { CartItemWithVariant } from "@/lib/types"
import QuantityStepper from "@/app/components/QuantityStepper"
import { maxCartQuantityFor } from "@/lib/validation"

export function CartItemRow({ cartItem }: { cartItem: CartItemWithVariant }) {
  const [state, formAction, isPending] = useActionState(updateCartItemQuantityAction, null)
  const reachedStockLimit = cartItem.quantity >= cartItem.variant.stock
  const reachedLimit = cartItem.quantity >= maxCartQuantityFor(cartItem.variant.stock)

  return (
    <div className="space-y-1">
      <form action={formAction}>
        <input type="hidden" name="cartItemId" value={cartItem.id} />
        <QuantityStepper
          value={cartItem.quantity}
          decrementProps={{ type: "submit", name: "type", value: "decrement", disabled: isPending || cartItem.quantity <= 1 }}
          incrementProps={{ type: "submit", name: "type", value: "increment", disabled: isPending || reachedLimit }}
        />
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
