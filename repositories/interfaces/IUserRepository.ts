import type { ProfileInput, ShippingAddressInput } from "@/lib/accountValidation";
import { User } from "../entities/User";

export interface IUserRepository {
  findByUserId(userId:number): Promise<User | null>,
  updateProfile(userId: number, input: ProfileInput): Promise<User>,
  updateShippingAddress(userId: number, input: ShippingAddressInput): Promise<User>,
}
