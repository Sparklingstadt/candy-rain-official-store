export type StoreStatus = "PUBLISHED" | "UNPUBLISHED" | "NOT_LISTED"

export const storeStatusLabel: Record<StoreStatus, string> = {
  PUBLISHED: "公開中",
  UNPUBLISHED: "非公開",
  NOT_LISTED: "ストアに未表示",
}

// Mirrors the store's listing rule: a published product appears only while it has a published variant.
export function storeStatusOf(product: { isPublished: boolean, variants: { isPublished: boolean }[] }): StoreStatus {
  if (!product.isPublished) return "UNPUBLISHED"
  return product.variants.some(variant => variant.isPublished) ? "PUBLISHED" : "NOT_LISTED"
}
