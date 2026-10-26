"use client"
import { createProductAction } from "@/app/actions/admin/createProductAction"
import { updateProductAction } from "@/app/actions/admin/updateProductAction"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import FormField from "@/app/components/FormField"
import FormMessage from "@/app/components/FormMessage"
import {
  MAX_PRODUCT_CATEGORY_LENGTH,
  MAX_PRODUCT_DESCRIPTION_LENGTH,
  MAX_PRODUCT_NAME_LENGTH,
  type ProductField,
} from "@/lib/productValidation"
import { salesTypeMeta, salesTypes } from "@/lib/salesTypes"
import ImagePicker from "./ImagePicker"

export type ProductFormValues = Record<ProductField, string>

const selectClassName = "h-8 w-full border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"

// Used for both registering (no productId) and editing an existing product.
export default function ProductForm({ productId, initial }: { productId?: number, initial: ProductFormValues }) {
  const [state, formAction, isPending] = useActionState(productId === undefined ? createProductAction : updateProductAction, null)
  // After a rejected submit, keep what the admin typed instead of the saved product.
  const values = state && !state.success ? state.values : initial
  const errors = state && !state.success ? state.fieldErrors : {}
  const submitLabel = productId === undefined ? "登録する" : "保存する"

  return (
    <form action={formAction} className="grid gap-5">
      {productId !== undefined && <input type="hidden" name="productId" value={productId} />}
      <FormField name="name" label="商品名" error={errors.name}>
        {props => <Input {...props} defaultValue={values.name} maxLength={MAX_PRODUCT_NAME_LENGTH} required />}
      </FormField>
      <FormField name="description" label="説明" error={errors.description} optional>
        {props => <Textarea {...props} defaultValue={values.description} maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH} rows={4} />}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="category" label="カテゴリ" error={errors.category} optional>
          {props => <Input {...props} defaultValue={values.category} maxLength={MAX_PRODUCT_CATEGORY_LENGTH} />}
        </FormField>
        <FormField name="salesType" label="販売区分" error={errors.salesType}>
          {props => (
            <select {...props} key={values.salesType} defaultValue={values.salesType} required className={selectClassName}>
              {salesTypes.map(type => <option key={type} value={type}>{salesTypeMeta[type].label}</option>)}
            </select>
          )}
        </FormField>
      </div>
      <ImagePicker name="thumbnailImageUrl" legend="商品画像" selected={values.thumbnailImageUrl} error={errors.thumbnailImageUrl} />
      <div className="space-y-3">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">{isPending ? "保存中..." : submitLabel}</Button>
        <FormMessage state={state} isPending={isPending} successMessage="商品情報を保存しました" />
      </div>
    </form>
  )
}
