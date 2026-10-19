import type { SalesType } from "@/lib/salesTypes"
import { Variant } from "./Variant"

export class Product {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly category: string | null,
    public readonly salesType: SalesType,
    public readonly description: string,
    public readonly thumbnailImageUrl: string,
  ) {
    if(id < 0) {
      throw new Error("id must be non-negative!")
    }
    if(!name) {
      throw new Error("name is required!")
    }
    if(!thumbnailImageUrl) {
      throw new Error("thumbnailImageUrl is required!")
    }
  }
}

export type ProductWithVariant = Product & {
  variants: Variant[]
}
