export class OrderItem {
  constructor(
    public readonly id: number,
    public readonly orderId: number,
    public readonly variantId: number,
    public readonly variantName: string,
    public readonly priceAtPurchase: number,
    public readonly quantity: number,
  ) {
    if(id < 0) {
      throw new Error("id must be non-negative!")
    }
    if(orderId < 0) {
      throw new Error("orderId must be non-negative!")
    }
    if(variantId < 0) {
      throw new Error("variantId must be non-negative!")
    }
    if(!variantName) {
      throw new Error("variantName is required!")
    }
    if(!priceAtPurchase) {
      throw new Error("priceAtPurchase is required!")
    }
    if(!quantity) {
      throw new Error("quantity is required!")
    }
  }
}
