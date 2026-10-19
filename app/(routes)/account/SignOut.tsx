"use client"
import { signOut } from "next-auth/react"
import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignOut() {
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
    <Button type="button" variant="outline" onClick={handleSignOut} disabled={isPending}>
      <LogOut /> サインアウト
    </Button>
  )
}
