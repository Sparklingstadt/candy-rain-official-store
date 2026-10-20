export class Order {
  constructor(
    public readonly id: number,
    public readonly paymentStatus: string,
    public readonly shippingStatus: string,
    public readonly shippingPrice: number,
    public readonly totalPrice: number,
    public readonly orderedAt: Date,
    public readonly userId: number,
  ) {
    if(id < 0) {
      throw new Error("id must be non-negative!")
    }
    if(!paymentStatus) {
      throw new Error("paymentStatus is required!")
    }
    if(!shippingStatus) {
      throw new Error("shippingStatus is required!")
    }
    if(!Number.isInteger(shippingPrice) || shippingPrice < 0) {
      throw new Error("shippingPrice must be a non-negative integer!")
    }
    if(!totalPrice) {
      throw new Error("totalPrice is required!")
    }
    if(!orderedAt) {
      throw new Error("orderedAt is required!")
    }
    if(userId === undefined) {
      throw new Error("userId is required!")
    }
  }
}
