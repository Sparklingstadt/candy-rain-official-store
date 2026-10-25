import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
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
    jwt({ token, user }) {
      if (user) { // User is available during sign-in
        token.id = user.id
        token.role = user.role
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
