"use client"
import { updateProfileAction } from "@/app/actions/updateProfileAction"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormField from "@/app/components/FormField"
import FormMessage from "@/app/components/FormMessage"
import { MAX_NAME_LENGTH, type ProfileInput } from "@/lib/accountValidation"

export default function ProfileForm({ profile }: { profile: ProfileInput }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, null)
  // After a rejected submit, keep what the user typed instead of the saved profile.
  const values = state && !state.success ? state.values : profile
  const errors = state && !state.success ? state.fieldErrors : {}

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <FormField name="firstName" label="名" error={errors.firstName}>
        {props => <Input {...props} defaultValue={values.firstName} autoComplete="given-name" maxLength={MAX_NAME_LENGTH} required />}
      </FormField>
      <FormField name="lastName" label="姓" error={errors.lastName}>
        {props => <Input {...props} defaultValue={values.lastName} autoComplete="family-name" maxLength={MAX_NAME_LENGTH} required />}
      </FormField>
      <div className="space-y-3 sm:col-span-2">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">{isPending ? "保存中..." : "変更を保存"}</Button>
        <FormMessage state={state} isPending={isPending} successMessage="アカウント情報を保存しました" />
      </div>
    </form>
  )
}
