import imageMapping from "../assets/candy-collection/shop-assets/image-mapping.json"
import { isCatalogImageUrl } from "./productImageCatalog"

type ProductImageSource = {
  id: number
  name: string
  thumbnailImageUrl: string
}

type VariantImageSource = {
  id: number
  name: string
  productId: number
  imageUrl: string
}

// An image chosen from the catalog (e.g. in the admin screen) is used as is. Otherwise use the bundled
// artwork even when an existing DB still contains placeholder URLs; unknown entries retain their own images.
export function getProductImageUrl(product: ProductImageSource): string {
  if (isCatalogImageUrl(product.thumbnailImageUrl)) return product.thumbnailImageUrl
  return imageMapping.products.find(
    entry => entry.id === product.id && entry.name === product.name
  )?.thumbnailImageUrl ?? product.thumbnailImageUrl
}

export function getVariantImageUrl(variant: VariantImageSource): string {
  if (isCatalogImageUrl(variant.imageUrl)) return variant.imageUrl
  return imageMapping.variants.find(
    entry => entry.id === variant.id && entry.productId === variant.productId && entry.name === variant.name
  )?.imageUrl ?? variant.imageUrl
}
