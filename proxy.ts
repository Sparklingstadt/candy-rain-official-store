import { auth } from "@/auth"
import type { NextRequest } from "next/server"

const demoProxy = auth((req) => {
  const { pathname, origin } = req.nextUrl
  if(!req.auth && !["/signin", "/signout"].includes(pathname)) {
    return Response.redirect(new URL("/signin", origin))
  }
  if(req.auth && pathname === "/signin") {
    return Response.redirect(new URL("/products", origin))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|webp)$).*)"],
}

export async function proxy(request: NextRequest, event: Parameters<typeof demoProxy>[1]) {
  const response = await demoProxy(request, event)
  // Proxy only checks access. Auth endpoints own cookie mutations, so an
  // in-flight page/prefetch response cannot restore a signed-out session.
  response?.headers.delete("set-cookie")
  return response
}
