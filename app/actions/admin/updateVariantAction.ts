"use server"
import { requireAdmin } from "@/lib/auth"
import { parseVariantUpdateInput, variantUpdateFormValues, type VariantUpdateField } from "@/lib/productValidation"
import type { FormActionState } from "@/lib/types"
import { requireNonNegativeInteger } from "@/lib/validation"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { ProductAdminError, updateVariant } from "@/services/admin/productAdminService"
import { FAILED_MESSAGE, INVALID_INPUT_MESSAGE, revalidateProducts } from "./productActionShared"

export async function updateVariantAction(_prevState: unknown, formData: FormData): Promise<FormActionState<VariantUpdateField>> {
  await requireAdmin()
  const values = variantUpdateFormValues(formData)

  let ids
  try {
    ids = {
      productId: requireNonNegativeInteger(formData.get("productId"), "productId"),
      variantId: requireNonNegativeInteger(formData.get("variantId"), "variantId"),
    }
  } catch {
    return { success: false, message: INVALID_INPUT_MESSAGE, fieldErrors: {}, values }
  }
  const result = parseVariantUpdateInput(formData)
  if (!result.success) return { ...result, message: INVALID_INPUT_MESSAGE }

  try {
    await updateVariant(new VariantRepository(), ids.productId, ids.variantId, result.data)
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
