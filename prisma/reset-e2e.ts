import { prisma } from "@/lib/prisma"

async function resetE2eData() {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany({ where: { userId: 0 } }),
    prisma.cartItem.deleteMany({ where: { cart: { userId: 0 } } }),
    prisma.variant.update({ where: { id: 0 }, data: { stock: 50 } }),
    prisma.variant.update({ where: { id: 1 }, data: { stock: 50, price: 800 } }),
    // Seeded products and variants can be hidden from the admin screens; tests expect them on sale.
    prisma.product.updateMany({ where: { id: { lte: 4 } }, data: { isPublished: true } }),
    prisma.variant.updateMany({ where: { id: { lte: 9 } }, data: { isPublished: true } }),
    // Products registered through the admin screens (anything beyond the seeded IDs 0-4).
    prisma.cartItem.deleteMany({ where: { variant: { productId: { gte: 5 } } } }),
    prisma.variant.deleteMany({ where: { productId: { gte: 5 } } }),
    prisma.product.deleteMany({ where: { id: { gte: 5 } } }),
  ])
}

resetE2eData()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
