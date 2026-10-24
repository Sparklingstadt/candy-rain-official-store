import type { IUserRepository } from "@/repositories/interfaces/IUserRepository"
import type { PaymentGateway } from "./paymentGateway"

export async function ensureStripeCustomer(gateway: PaymentGateway, users: IUserRepository, userId: number) {
  const existing = await users.findStripeCustomerId(userId)
  if (existing) return existing
  // A concurrent first request may win the update; its customer is used and ours stays unused.
  return users.saveStripeCustomerId(userId, await gateway.createCustomer(userId))
}

export async function listSavedCards(gateway: PaymentGateway, users: IUserRepository, userId: number) {
  const customerId = await users.findStripeCustomerId(userId)
  return customerId ? gateway.listCards(customerId) : []
}

export async function startCardSetup(gateway: PaymentGateway, users: IUserRepository, userId: number) {
  return gateway.createCardSetup(await ensureStripeCustomer(gateway, users, userId))
}

export async function removeSavedCard(gateway: PaymentGateway, users: IUserRepository, userId: number, paymentMethodId: string) {
  const customerId = await users.findStripeCustomerId(userId)
  if (!customerId || !await gateway.removeCard(customerId, paymentMethodId)) {
    throw new Error("Card not found")
  }
}
