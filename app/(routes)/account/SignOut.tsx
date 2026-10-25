"use client"
import { signOut } from "next-auth/react"
import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

// compact hides the label below the sm breakpoint (icon only) for tight headers such as the admin one.
export default function SignOut({ compact = false }: { compact?: boolean }) {
  const [isPending, setIsPending] = useState(false)
  const handleSignOut = async () => {
    setIsPending(true)
    try {
      await signOut({ redirectTo: "/signout" })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleSignOut} disabled={isPending} aria-label={compact ? "サインアウト" : undefined}>
      <LogOut />{compact ? <span className="sr-only sm:not-sr-only">サインアウト</span> : " サインアウト"}
    </Button>
  )
}
