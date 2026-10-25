// Mirrors the Role enum in prisma/schema.prisma. Kept free of Prisma imports so the proxy and client code can use it.
export const roles = ["CUSTOMER", "ADMIN"] as const
export type Role = (typeof roles)[number]
