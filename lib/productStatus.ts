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

export function countStoreStatuses(products: { isPublished: boolean, variants: { isPublished: boolean }[] }[]): Record<StoreStatus, number> {
  const counts: Record<StoreStatus, number> = { PUBLISHED: 0, UNPUBLISHED: 0, NOT_LISTED: 0 }
  for (const product of products) counts[storeStatusOf(product)]++
  return counts
}
