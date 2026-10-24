import type { ProfileInput, ShippingAddressInput } from "@/lib/accountValidation"
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository"

export const updateProfile = (repo: IUserRepository, userId: number, input: ProfileInput) =>
  repo.updateProfile(userId, input)
export const updateShippingAddress = (repo: IUserRepository, userId: number, input: ShippingAddressInput) =>
  repo.updateShippingAddress(userId, input)
