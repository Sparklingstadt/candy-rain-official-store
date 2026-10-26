"use server"
import { requireAdmin } from "@/lib/auth"
import { parseProductInput, productFormValues, type ProductField } from "@/lib/productValidation"
import type { FormActionState } from "@/lib/types"
import { requireNonNegativeInteger } from "@/lib/validation"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { ProductAdminError, updateProduct } from "@/services/admin/productAdminService"
import { FAILED_MESSAGE, INVALID_INPUT_MESSAGE, revalidateProducts } from "./productActionShared"

export async function updateProductAction(_prevState: unknown, formData: FormData): Promise<FormActionState<ProductField>> {
  await requireAdmin()
  const values = productFormValues(formData)

  let productId
  try {
    productId = requireNonNegativeInteger(formData.get("productId"), "productId")
  } catch {
    return { success: false, message: INVALID_INPUT_MESSAGE, fieldErrors: {}, values }
  }
  const result = parseProductInput(formData)
  if (!result.success) return { ...result, message: INVALID_INPUT_MESSAGE }

  try {
    await updateProduct(new ProductRepository(), productId, result.data)
  } catch (error) {
    if (error instanceof ProductAdminError) {
      revalidateProducts()
      return { success: false, message: error.message, fieldErrors: {}, values }
    }
    console.error(error)
    return { success: false, message: FAILED_MESSAGE, fieldErrors: {}, values }
  }

  revalidateProducts()
  return { success: true }
}
