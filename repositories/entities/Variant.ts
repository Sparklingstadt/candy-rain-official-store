export class Variant {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly productId: number,
    public readonly price: number,
    public readonly stock: number,
    public readonly imageUrl: string
  ) {
    if(id < 0) {
      throw new Error("id must be non-negative!")
    }
    if(!name) {
      throw new Error("name is required!")
    }
    if(productId < 0) {
      throw new Error("productId must be non-negative!")
    }
    if(!price) {
      throw new Error("price is required!")
    }
    if(!Number.isInteger(stock) || stock < 0) {
      throw new Error("stock must be a non-negative integer!")
    }
    if(!imageUrl) {
      throw new Error("imageUrl is required!")
    }
  }
}
