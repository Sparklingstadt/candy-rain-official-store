// A variant can be bought only while both it and its product are published.
export function isOnSale(variant: { isPublished: boolean, product: { isPublished: boolean } }): boolean {
  return variant.isPublished && variant.product.isPublished
}
