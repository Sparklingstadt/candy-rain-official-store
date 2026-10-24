import { prisma } from "@/lib/prisma"
import type { ProfileInput, ShippingAddressInput } from "@/lib/accountValidation"
import { IUserRepository } from "../interfaces/IUserRepository"

// Credentials never leave the auth flow.
const omit = { passwordHash: true } as const

export class UserRepository implements IUserRepository {
  async findByUserId(userId: number) {
    return await prisma.user.findUnique({
      where: { id: userId },
      omit,
    })
  }

  async updateProfile(userId: number, input: ProfileInput) {
    return await prisma.user.update({
      where: { id: userId },
      data: input,
      omit,
    })
  }

  async updateShippingAddress(userId: number, input: ShippingAddressInput) {
    return await prisma.user.update({
      where: { id: userId },
      data: input,
      omit,
    })
  }
}
