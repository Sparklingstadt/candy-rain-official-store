export const INITIAL_PAYMENT_STATUS = "支払い待ち"
export const PAID_PAYMENT_STATUS = "支払い済み"
// The order was saved but Stripe failed to capture the held amount.
export const PAYMENT_ERROR_STATUS = "決済エラー"
export const REFUNDED_PAYMENT_STATUS = "返金済み"
// The refund request to Stripe failed; the admin can retry it.
export const REFUND_ERROR_PAYMENT_STATUS = "返金エラー"
export const INITIAL_SHIPPING_STATUS = "未発送"
export const PREPARING_SHIPPING_STATUS = "発送準備中"
export const SHIPPED_SHIPPING_STATUS = "発送済み"
export const CANCELLED_SHIPPING_STATUS = "キャンセル"
