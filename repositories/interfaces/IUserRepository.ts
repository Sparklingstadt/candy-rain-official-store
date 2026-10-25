import type { ProfileInput, ShippingAddressInput } from "@/lib/accountValidation";
import type { Role } from "@/lib/roles";
import { User } from "../entities/User";

export interface IUserRepository {
  findByUserId(userId:number): Promise<User | null>,
  updateProfile(userId: number, input: ProfileInput): Promise<User>,
  updateShippingAddress(userId: number, input: ShippingAddressInput): Promise<User>,
  findRoleByUserId(userId: number): Promise<Role | null>,
  findStripeCustomerId(userId: number): Promise<string | null>,
  // Keeps an already stored customer and returns the one that is stored.
  saveStripeCustomerId(userId: number, customerId: string): Promise<string>,
}
