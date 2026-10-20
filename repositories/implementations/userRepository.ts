import { prisma } from "@/lib/prisma"
import { IUserRepository } from "../interfaces/IUserRepository"

export class UserRepository implements IUserRepository {
  async findByUserId(userId: number) {
    return await prisma.user.findUnique({
      where: { id: userId }
    })
  }
}