import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUserId(){
  const session = await auth()
  if(!session || !session.user || !session.user.id) redirect("/signin")

  const userId = Number(session.user.id)
  if (!Number.isInteger(userId) || userId < 0) redirect("/signin")

  return userId
}
