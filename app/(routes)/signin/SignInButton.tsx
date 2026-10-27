"use client"
import { useFormStatus } from "react-dom"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignInButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
      {pending && <LoaderCircle className="animate-spin" />}
      {pending ? "Candy Rain ID へ移動中..." : "Candy Rain ID でサインイン"}
    </Button>
  )
}
