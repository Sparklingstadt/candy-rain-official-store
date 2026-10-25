import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRepository } from "@/repositories/implementations/userRepository";
import { isAdmin } from "@/services/accountService";

export async function requireUserId(){
  const session = await auth()
  if(!session || !session.user || !session.user.id) redirect("/signin")

  const userId = Number(session.user.id)
  if (!Number.isInteger(userId) || userId < 0) redirect("/signin")

  return userId
}

export async function requireAdmin(){
  const userId = await requireUserId()
  if(!(await isAdmin(new UserRepository(), userId))) {
    // The proxy trusts the JWT role, so a token that still says ADMIN would bounce between /products and /admin.
    // /signout is the one page it lets admins reach, which breaks the loop.
    const session = await auth()
    redirect(session?.user?.role === "ADMIN" ? "/signout" : "/products")
  }

  return userId
}
