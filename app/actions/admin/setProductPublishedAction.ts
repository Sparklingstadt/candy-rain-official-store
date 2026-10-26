"use server"
import { requireAdmin } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireNonNegativeInteger, requirePublishedFlag } from "@/lib/validation"
import { ProductRepository } from "@/repositories/implementations/productRepository"
import { ProductAdminError, setProductPublished } from "@/services/admin/productAdminService"
import { FAILED_MESSAGE, INVALID_INPUT_MESSAGE, revalidateProducts } from "./productActionShared"

export async function setProductPublishedAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let input
  try {
    input = {
      productId: requireNonNegativeInteger(formData.get("productId"), "productId"),
      published: requirePublishedFlag(formData.get("published")),
    }
  } catch {
    return { success: false, message: INVALID_INPUT_MESSAGE }
  }

  try {
    await setProductPublished(new ProductRepository(), input.productId, input.published)
  } catch (error) {
    if (error instanceof ProductAdminError) {
      revalidateProducts()
      return { success: false, message: error.message }
    }
    console.error(error)
    return { success: false, message: FAILED_MESSAGE }
  }

  revalidateProducts()
  return { success: true, message: input.published ? "公開しました" : "非公開にしました" }
}
