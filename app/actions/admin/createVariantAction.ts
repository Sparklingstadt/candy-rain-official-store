"use server"
import { requireAdmin } from "@/lib/auth"
import { parseVariantInput, variantFormValues, type VariantField } from "@/lib/productValidation"
import type { FormActionState } from "@/lib/types"
import { requireNonNegativeInteger } from "@/lib/validation"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { createVariant, ProductAdminError } from "@/services/admin/productAdminService"
import { redirect } from "next/navigation"
import { FAILED_MESSAGE, INVALID_INPUT_MESSAGE, revalidateProducts } from "./productActionShared"

export async function createVariantAction(_prevState: unknown, formData: FormData): Promise<FormActionState<VariantField>> {
  await requireAdmin()
  const values = variantFormValues(formData)

  let productId
  try {
    productId = requireNonNegativeInteger(formData.get("productId"), "productId")
  } catch {
    return { success: false, message: INVALID_INPUT_MESSAGE, fieldErrors: {}, values }
  }
  const result = parseVariantInput(formData)
  if (!result.success) return { ...result, message: INVALID_INPUT_MESSAGE }

  try {
    await createVariant(new ProductRepository(), new VariantRepository(), productId, result.data)
  } catch (error) {
    if (error instanceof ProductAdminError) {
      revalidateProducts()
      return { success: false, message: error.message, fieldErrors: {}, values }
    }
    console.error(error)
    return { success: false, message: FAILED_MESSAGE, fieldErrors: {}, values }
  }

  revalidateProducts()
  // redirect throws to navigate, so it stays outside the try block.
  redirect(`/admin/products/${productId}`)
}
