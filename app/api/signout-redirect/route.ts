import { candyRainIdIssuer } from "@/auth"

// After the store session is cleared, also end the Candy Rain ID session;
// otherwise the next "Candy Rain ID でサインイン" would sign in again without a password.
// The identity server sends the browser back to /signout.
export function GET(request: Request) {
  const signoutUrl = new URL("/signout", request.url)
  if (!candyRainIdIssuer) return Response.redirect(signoutUrl, 303)

  const logoutUrl = new URL(`${candyRainIdIssuer}/logout`)
  logoutUrl.searchParams.set("post_logout_redirect_uri", signoutUrl.toString())
  if (process.env.AUTH_CANDY_RAIN_ID_ID) logoutUrl.searchParams.set("client_id", process.env.AUTH_CANDY_RAIN_ID_ID)
  return Response.redirect(logoutUrl, 303)
}
