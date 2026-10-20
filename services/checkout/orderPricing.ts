// Flat demo shipping fee charged on every order.
export const SHIPPING_PRICE = 1000

type PricedLine = {
  price: number
  quantity: number
}

type PricedCartItem = {
  quantity: number
  variant: {
    price: number
  }
}

export function calculateSubtotal(lines: PricedLine[]) {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0)
}

export function calculateCartSubtotal(items: PricedCartItem[]) {
  return calculateSubtotal(items.map(item => ({ price: item.variant.price, quantity: item.quantity })))
}

export function calculateOrderTotal(
  items: PricedCartItem[],
  shippingPrice: number
) {
  return calculateCartSubtotal(items) + shippingPrice
}
