import imageMapping from "../assets/candy-collection/shop-assets/image-mapping.json"

export type CatalogImage = { url: string, label: string }

// The bundled artwork admins can choose from. Kept in code because public/ cannot be listed at runtime on Vercel.
export const productImageCatalog: readonly CatalogImage[] = [
  ...imageMapping.products.map(product => ({ url: product.thumbnailImageUrl, label: product.name })),
  ...imageMapping.variants.map(variant => {
    const productName = imageMapping.products.find(product => product.id === variant.productId)?.name
    return { url: variant.imageUrl, label: productName ? `${productName} / ${variant.name}` : variant.name }
  }),
]

// Exact match only, so paths such as "../" or external URLs are never accepted.
export function isCatalogImageUrl(url: string): boolean {
  return productImageCatalog.some(image => image.url === url)
}
