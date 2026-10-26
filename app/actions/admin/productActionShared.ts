import { revalidatePath } from "next/cache"

export const INVALID_INPUT_MESSAGE = "入力内容を確認してください"
export const FAILED_MESSAGE = "処理に失敗しました。時間をおいてもう一度お試しください"

// Product changes show up on every admin page (lists, inventory) and on the store's listings, details and carts.
export function revalidateProducts() {
  revalidatePath("/admin", "layout")
  revalidatePath("/", "layout")
}
