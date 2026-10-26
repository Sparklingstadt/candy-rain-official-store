"use server"
import { requireAdmin } from "@/lib/auth"
import { parseProductInput, productFormValues, type ProductField } from "@/lib/productValidation"
import type { FormActionState } from "@/lib/types"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { createProduct, ProductAdminError } from "@/services/admin/productAdminService"
import { redirect } from "next/navigation"
import { FAILED_MESSAGE, INVALID_INPUT_MESSAGE, revalidateProducts } from "./productActionShared"

export async function createProductAction(_prevState: unknown, formData: FormData): Promise<FormActionState<ProductField>> {
  await requireAdmin()
  const result = parseProductInput(formData)
  if (!result.success) return { ...result, message: INVALID_INPUT_MESSAGE }

  let productId: number
  try {
    productId = (await createProduct(new ProductRepository(), result.data)).id
  } catch (error) {
    const values = productFormValues(formData)
    if (error instanceof ProductAdminError) {
      revalidateProducts()
      return { success: false, message: error.message, fieldErrors: {}, values }
    }
    console.error(error)
    return { success: false, message: FAILED_MESSAGE, fieldErrors: {}, values }
  }

  revalidateProducts()
  // redirect throws to navigate, so it stays outside the try block.
  redirect(`/admin/products/${productId}?created=1`)
}
