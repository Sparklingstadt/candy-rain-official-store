import imageMapping from "../assets/candy-collection/shop-assets/image-mapping.json"

export type CatalogImage = { url: string, label: string }

// The bundled artwork admins can choose from. Kept in code because public/ cannot be listed at runtime on Vercel.
export const productImageCatalog: readonly CatalogImage[] = [
  ...imageMapping.products.map(product => ({ url: product.thumbnailImageUrl, label: `${product.name}（商品画像）` })),
  ...imageMapping.variants.map(variant => ({ url: variant.imageUrl, label: variant.name })),
]

// Exact match only, so paths such as "../" or external URLs are never accepted.
export function isCatalogImageUrl(url: string): boolean {
  return productImageCatalog.some(image => image.url === url)
}
