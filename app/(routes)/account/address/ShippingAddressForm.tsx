"use client"
import { updateShippingAddressAction } from "@/app/actions/updateShippingAddressAction"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormField from "@/app/components/FormField"
import FormMessage from "@/app/components/FormMessage"
import { MAX_ADDRESS_LINE_LENGTH, type ShippingAddressField } from "@/lib/accountValidation"
import { PREFECTURES } from "@/lib/prefectures"

export default function ShippingAddressForm({ address }: { address: Record<ShippingAddressField, string> }) {
  const [state, formAction, isPending] = useActionState(updateShippingAddressAction, null)
  // After a rejected submit, keep what the user typed instead of the saved address.
  const values = state && !state.success ? state.values : address
  const errors = state && !state.success ? state.fieldErrors : {}

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <FormField name="postalCode" label="郵便番号" error={errors.postalCode}>
        {props => <Input {...props} defaultValue={values.postalCode} inputMode="numeric" autoComplete="postal-code" placeholder="123-4567" maxLength={8} required />}
      </FormField>
      <FormField name="prefecture" label="都道府県" error={errors.prefecture}>
        {/* key remounts the select so a rejected value is shown again after the form reset. */}
        {props => (
          <select {...props} key={values.prefecture} defaultValue={values.prefecture} autoComplete="address-level1" required className="h-8 w-full border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30">
            <option value="">選択してください</option>
            {PREFECTURES.map(prefecture => <option key={prefecture} value={prefecture}>{prefecture}</option>)}
          </select>
        )}
      </FormField>
      <FormField name="addressLine1" label="市区町村・番地" error={errors.addressLine1} className="sm:col-span-2">
        {props => <Input {...props} defaultValue={values.addressLine1} autoComplete="address-line1" maxLength={MAX_ADDRESS_LINE_LENGTH} required />}
      </FormField>
      <FormField name="addressLine2" label="建物名・部屋番号" error={errors.addressLine2} optional className="sm:col-span-2">
        {props => <Input {...props} defaultValue={values.addressLine2} autoComplete="address-line2" maxLength={MAX_ADDRESS_LINE_LENGTH} />}
      </FormField>
      <div className="space-y-3 sm:col-span-2">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">{isPending ? "保存中..." : "お届け先を保存"}</Button>
        <FormMessage state={state} isPending={isPending} successMessage="お届け先を保存しました" />
      </div>
    </form>
  )
}
