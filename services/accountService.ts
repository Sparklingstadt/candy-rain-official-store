import type { ProfileInput, ShippingAddressInput } from "@/lib/accountValidation"
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository"

// The role is read from the DB on every call so a demoted user loses access even with an old session.
export const isAdmin = async (repo: IUserRepository, userId: number) =>
  (await repo.findRoleByUserId(userId)) === "ADMIN"

export const updateProfile = (repo: IUserRepository, userId: number, input: ProfileInput) =>
  repo.updateProfile(userId, input)
export const updateShippingAddress = (repo: IUserRepository, userId: number, input: ShippingAddressInput) =>
  repo.updateShippingAddress(userId, input)
