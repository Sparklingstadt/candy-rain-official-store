import { DefaultSession } from "next-auth"
import { DefaultJWT } from "@auth/core/jwt"
import type { Role } from "@/lib/roles"

declare module "next-auth" {
  interface User {
    role?: Role
  }

  interface Session {
    user: {
      id: string
      role?: Role
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends DefaultJWT {
    id?: string
    role?: Role
  }
}