import { signIn } from "@/auth"
import SignInButton from "./SignInButton"

export function CandyRainIdSignIn({ providerId }: { providerId: string }) {
  const handleSignIn = async () => {
    "use server"
    await signIn(providerId, { redirectTo: "/products" })
  }

  return (
    <form action={handleSignIn}>
      <SignInButton />
    </form>
  )
}
