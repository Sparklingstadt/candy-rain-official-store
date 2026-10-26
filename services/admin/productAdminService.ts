import type { ProductInput, VariantInput, VariantUpdateInput } from "@/lib/productValidation"
import type { IProductRepository } from "@/repositories/interfaces/IProductRepository"
import type { IVariantRepository } from "@/repositories/interfaces/IVariantRepository"

// Caps keep the public demo database from growing without bound.
export const MAX_PRODUCTS = 30
export const MAX_VARIANTS_PER_PRODUCT = 10

export type ProductAdminErrorCode = "PRODUCT_NOT_FOUND" | "VARIANT_NOT_FOUND" | "PRODUCT_LIMIT" | "VARIANT_LIMIT"

export class ProductAdminError extends Error {
  constructor(
    public readonly code: ProductAdminErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ProductAdminError"
  }
}

const productNotFound = () => new ProductAdminError("PRODUCT_NOT_FOUND", "商品が見つかりません")
const variantNotFound = () => new ProductAdminError("VARIANT_NOT_FOUND", "バリエーションが見つかりません")

export const listProductsForAdmin = (repo: IProductRepository) => repo.findManyForAdmin()
export const getProductForAdmin = (repo: IProductRepository, productId: number) => repo.findByIdForAdmin(productId)
export const getVariantForAdmin = (repo: IVariantRepository, productId: number, variantId: number) => repo.findByIdForAdmin(productId, variantId)

// New products start hidden so an admin can add variants before the store shows them.
export async function createProduct(repo: IProductRepository, input: ProductInput, limit = MAX_PRODUCTS): Promise<{ id: number }> {
  const created = await repo.createWithinLimit(input, limit)
  if (!created) throw new ProductAdminError("PRODUCT_LIMIT", `登録できる商品は ${limit} 件までです`)
  return created
}

export async function updateProduct(repo: IProductRepository, productId: number, input: ProductInput): Promise<void> {
  if (!await repo.update(productId, input)) throw productNotFound()
}

// Sets the target state rather than toggling, so repeating the request is harmless.
export async function setProductPublished(repo: IProductRepository, productId: number, published: boolean): Promise<void> {
  if (!await repo.setPublished(productId, published)) throw productNotFound()
}

export async function createVariant(
  productRepo: IProductRepository,
  variantRepo: IVariantRepository,
  productId: number,
  input: VariantInput,
  limit = MAX_VARIANTS_PER_PRODUCT,
): Promise<{ id: number }> {
  if (!await productRepo.findByIdForAdmin(productId)) throw productNotFound()
  const created = await variantRepo.createWithinLimit(productId, input, limit)
  if (!created) throw new ProductAdminError("VARIANT_LIMIT", `1 つの商品に登録できるバリエーションは ${limit} 件までです`)
  return created
}

export async function updateVariant(repo: IVariantRepository, productId: number, variantId: number, input: VariantUpdateInput): Promise<void> {
  if (!await repo.update(productId, variantId, input)) throw variantNotFound()
}

export async function setVariantPublished(repo: IVariantRepository, productId: number, variantId: number, published: boolean): Promise<void> {
  if (!await repo.setPublished(productId, variantId, published)) throw variantNotFound()
}
