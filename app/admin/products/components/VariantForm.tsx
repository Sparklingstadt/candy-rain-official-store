"use client"
import { createVariantAction } from "@/app/actions/admin/createVariantAction"
import { updateVariantAction } from "@/app/actions/admin/updateVariantAction"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormField from "@/app/components/FormField"
import FormMessage from "@/app/components/FormMessage"
import { MAX_VARIANT_NAME_LENGTH, type VariantField } from "@/lib/productValidation"
import ImagePicker from "./ImagePicker"

export type VariantFormValues = Record<VariantField, string>

// Adding takes the initial price and stock; editing changes only the name and image (price and stock live on the inventory page).
export default function VariantForm({ productId, variantId, initial }: { productId: number, variantId?: number, initial: VariantFormValues }) {
  const isEdit = variantId !== undefined
  const [state, formAction, isPending] = useActionState(isEdit ? updateVariantAction : createVariantAction, null)
  // After a rejected submit, keep what the admin typed instead of the saved variant.
  const values: Partial<VariantFormValues> = state && !state.success ? state.values : initial
  const errors: Partial<Record<VariantField, string>> = state && !state.success ? state.fieldErrors : {}

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="productId" value={productId} />
      {isEdit && <input type="hidden" name="variantId" value={variantId} />}
      <FormField name="name" label="バリエーション名" error={errors.name}>
        {props => <Input {...props} defaultValue={values.name} maxLength={MAX_VARIANT_NAME_LENGTH} required />}
      </FormField>
      {isEdit ? null : (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField name="price" label="価格（円）" error={errors.price}>
            {props => <Input {...props} defaultValue={values.price} inputMode="numeric" required />}
          </FormField>
          <FormField name="stock" label="初期在庫" error={errors.stock}>
            {props => <Input {...props} defaultValue={values.stock} inputMode="numeric" required />}
          </FormField>
        </div>
      )}
      <ImagePicker name="imageUrl" legend="バリエーション画像" selected={values.imageUrl ?? ""} error={errors.imageUrl} />
      <div className="space-y-3">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">{isPending ? "保存中..." : isEdit ? "保存する" : "追加する"}</Button>
        <FormMessage state={state} isPending={isPending} successMessage="バリエーションを保存しました" />
      </div>
    </form>
  )
}
