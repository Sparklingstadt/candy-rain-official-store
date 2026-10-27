import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { roles, type Role } from "@/lib/roles";

// Candy Rain ID (candy-rain-identity-server) is an OpenID Connect provider.
// It is enabled only when its issuer is configured, so local development and
// CI keep working with the demo credentials alone.
export const candyRainIdIssuer = process.env.AUTH_CANDY_RAIN_ID_ISSUER?.replace(/\/$/, "")
export const candyRainIdProviderId = "candy-rain-id"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...(candyRainIdIssuer ? [{
      id: candyRainIdProviderId,
      name: "Candy Rain ID",
      type: "oidc" as const,
      issuer: candyRainIdIssuer,
      clientId: process.env.AUTH_CANDY_RAIN_ID_ID,
      clientSecret: process.env.AUTH_CANDY_RAIN_ID_SECRET,
      authorization: { params: { scope: "openid email profile" } },
      profile(profile: { sub: string, email?: string, name?: string, role?: string }) {
        const role = roles.find((r) => r === profile.role)
        return { id: profile.sub, email: profile.email, name: profile.name, role }
      },
    }] : []),
    Credentials({
      credentials: {
        email: {
          type: "email",
          label: "Email",
          placeholder: "mail@example.com"
        },
        password: {
          type: "password",
          label: "Password",
          placeholder: "****"
        }
      },
      async authorize(credentials) {
        const email = typeof credentials.email === "string" ? credentials.email : ""
        const password = typeof credentials.password === "string" ? credentials.password : ""
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !(await compare(password, user.passwordHash))) return null

        return { id: String(user.id), email: user.email, role: user.role }
      }
    })
  ],
  callbacks: {
    async authorized({ auth }) {
      return !!auth
    },
    jwt({ token, user, account }) {
      if (user) { // User is available during sign-in
        // Auth.js replaces user.id with a random UUID for OAuth/OIDC sign-ins;
        // the identity server's subject (the store's User.id) is kept on the account.
        token.id = account?.provider === candyRainIdProviderId ? account.providerAccountId : user.id
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
