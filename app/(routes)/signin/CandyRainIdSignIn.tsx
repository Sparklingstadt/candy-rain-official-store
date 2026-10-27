import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"

export function CandyRainIdSignIn({ providerId }: { providerId: string }) {
  const handleSignIn = async () => {
    "use server"
    await signIn(providerId, { redirectTo: "/products" })
  }

  return (
    <form action={handleSignIn}>
      <Button type="submit" variant="outline" className="w-full">Candy Rain ID でサインイン</Button>
    </form>
  )
}
