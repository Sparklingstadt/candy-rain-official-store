"use server"
import { requireAdmin } from "@/lib/auth"
import type { ActionResult } from "@/lib/types"
import { requireNonNegativeInteger, requirePublishedFlag } from "@/lib/validation"
import { VariantRepository } from "@/repositories/implementations/variantRepository"
import { ProductAdminError, setVariantPublished } from "@/services/admin/productAdminService"
import { FAILED_MESSAGE, INVALID_INPUT_MESSAGE, revalidateProducts } from "./productActionShared"

export async function setVariantPublishedAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireAdmin()

  let input
  try {
    input = {
      productId: requireNonNegativeInteger(formData.get("productId"), "productId"),
      variantId: requireNonNegativeInteger(formData.get("variantId"), "variantId"),
      published: requirePublishedFlag(formData.get("published")),
    }
  } catch {
    return { success: false, message: INVALID_INPUT_MESSAGE }
  }

  try {
    await setVariantPublished(new VariantRepository(), input.productId, input.variantId, input.published)
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
