import NextAuth from "next-auth";
import { roles, type Role } from "@/lib/roles";

// Customers and admins sign in through Candy Rain ID (candy-rain-identity-server),
// an OpenID Connect provider that checks passwords against this store's User table.
export const candyRainIdIssuer = process.env.AUTH_CANDY_RAIN_ID_ISSUER?.replace(/\/$/, "")
export const candyRainIdProviderId = "candy-rain-id"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [{
    id: candyRainIdProviderId,
    name: "Candy Rain ID",
    type: "oidc",
    issuer: candyRainIdIssuer,
    clientId: process.env.AUTH_CANDY_RAIN_ID_ID,
    clientSecret: process.env.AUTH_CANDY_RAIN_ID_SECRET,
    authorization: { params: { scope: "openid email profile" } },
    profile(profile: { sub: string, email?: string, name?: string, role?: string }) {
      const role = roles.find((r) => r === profile.role)
      return { id: profile.sub, email: profile.email, name: profile.name, role }
    },
  }],
  // Failed sign-ins come back to the store's own page instead of the Auth.js default.
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async authorized({ auth }) {
      return !!auth
    },
    jwt({ token, user, account }) {
      if (user && account) { // Available during sign-in
        // Auth.js replaces user.id with a random UUID for OIDC sign-ins;
        // the identity server's subject (the store's User.id) is kept on the account.
        token.id = account.providerAccountId
        token.role = user.role as Role | undefined
      }
      return token
    },
    session({ session, token }) {
      if(token.id && session.user) {
        session.user.id = token.id
        if (token.role) session.user.role = token.role
      }
      return session
    },
  }
})
