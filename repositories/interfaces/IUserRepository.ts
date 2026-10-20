import { User } from "../entities/User";

export interface IUserRepository {
  findByUserId(userId:number): Promise<User | null>,
}