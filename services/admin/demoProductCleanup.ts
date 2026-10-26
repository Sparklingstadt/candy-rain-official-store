import { prisma } from "@/lib/prisma"

// Seeded products use IDs 0-4; anything above was registered through the admin screens.
export const FIRST_NON_SEED_PRODUCT_ID = 5

export type DemoProduct = { id: number, name: string, hasOrders: boolean }

const isRegistered = (productId: number) => productId >= FIRST_NON_SEED_PRODUCT_ID
const neverOrdered = { variants: { none: { orderItems: { some: {} } } } }

// Read-only: lists registered products and whether any of their variants appears in an order.
export async function findDemoProducts(): Promise<DemoProduct[]> {
  const products = await prisma.product.findMany({
    where: { id: { gte: FIRST_NON_SEED_PRODUCT_ID } },
    select: { id: true, name: true, variants: { select: { _count: { select: { orderItems: true } } } } },
    orderBy: { id: "asc" },
  })
  return products.map(product => ({
    id: product.id,
    name: product.name,
    hasOrders: product.variants.some(variant => variant._count.orderItems > 0),
  }))
}

// Deletes the given registered products that were never ordered, with their variants and cart rows.
// The conditions are re-checked inside the transaction, so a product ordered meanwhile, or a seeded one, is kept.
// Returns the IDs that were deleted.
export async function deleteUnorderedProducts(productIds: number[]): Promise<number[]> {
  const candidates = productIds.filter(isRegistered)
  if (candidates.length === 0) return []

  return prisma.$transaction(async tx => {
    const deletable = (await tx.product.findMany({
      where: { id: { in: candidates }, ...neverOrdered },
      select: { id: true },
      orderBy: { id: "asc" },
    })).map(product => product.id)
    if (deletable.length === 0) return []

    await tx.cartItem.deleteMany({ where: { variant: { productId: { in: deletable } } } })
    await tx.variant.deleteMany({ where: { productId: { in: deletable } } })
    await tx.product.deleteMany({ where: { id: { in: deletable } } })
    return deletable
  }, { isolationLevel: "Serializable" })
}
