import { prisma } from "@/lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import { hash } from "bcryptjs";
import imageMapping from "../assets/candy-collection/shop-assets/image-mapping.json";

const products = [
  { id: 0, name: "ランダム缶バッジ", category: "グッズ", salesType: "PRE_SALE", description: "", thumbnailImageUrl: "/products/candy/product-0.webp" },
  { id: 1, name: "クリアファイル", category: "グッズ", salesType: "PERMANENT", description: "", thumbnailImageUrl: "/products/candy/product-1.webp" },
  { id: 2, name: "アクリルスタンド", category: "グッズ", salesType: "MADE_TO_ORDER", description: "", thumbnailImageUrl: "/products/candy/product-2.webp" },
  { id: 3, name: "タペストリー", category: "グッズ", salesType: "POST_EVENT", description: "", thumbnailImageUrl: "/products/candy/product-3.webp" },
  { id: 4, name: "オリジナル TEE", category: "グッズ", salesType: "PERMANENT", description: "", thumbnailImageUrl: "/products/candy/product-4.webp" },
] satisfies Prisma.ProductCreateManyInput[]

async function main() {
  const demoPasswordHash = await hash("demo-password", 12)

  await prisma.product.createMany({
    data: products,
    skipDuplicates: true
  })

  await prisma.variant.createMany({
    data: [
      { id: 0, name: "ランダム缶バッジ", productId: 0, price: 500, stock: 50, imageUrl: "/products/candy/variant-0.webp" },
      { id: 1, name: "クリアファイル A", productId: 1, price: 800, stock: 50, imageUrl: "/products/candy/variant-1.webp" },
      { id: 2, name: "クリアファイル B", productId: 1, price: 800, stock: 50, imageUrl: "/products/candy/variant-2.webp" },
      { id: 3, name: "アクリルスタンド A", productId: 2, price: 1500, stock: 50, imageUrl: "/products/candy/variant-3.webp" },
      { id: 4, name: "アクリルスタンド B", productId: 2, price: 1500, stock: 50, imageUrl: "/products/candy/variant-4.webp" },
      { id: 5, name: "アクリルスタンド C", productId: 2, price: 1500, stock: 50, imageUrl: "/products/candy/variant-5.webp" },
      { id: 6, name: "タペストリー A", productId: 3, price: 4500, stock: 50, imageUrl: "/products/candy/variant-6.webp" },
      { id: 7, name: "タペストリー B", productId: 3, price: 4500, stock: 50, imageUrl: "/products/candy/variant-7.webp" },
      { id: 8, name: "オリジナル TEE A", productId: 4, price: 6500, stock: 50, imageUrl: "/products/candy/variant-8.webp" },
      { id: 9, name: "オリジナル TEE B", productId: 4, price: 6500, stock: 50, imageUrl: "/products/candy/variant-9.webp" },
    ],
    skipDuplicates: true
  })

  // createMany skips existing IDs; refresh only the matching catalog images and sales types.
  await prisma.$transaction([
    ...products.map(({ id, name, salesType }) =>
      prisma.product.updateMany({
        where: { id, name },
        data: { salesType },
      })
    ),
    ...imageMapping.products.map(({ id, name, thumbnailImageUrl }) =>
      prisma.product.updateMany({
        where: { id, name },
        data: { thumbnailImageUrl },
      })
    ),
    ...imageMapping.variants.map(({ id, name, productId, imageUrl }) =>
      prisma.variant.updateMany({
        where: { id, name, productId },
        data: { imageUrl },
      })
    ),
  ])

  await prisma.user.createMany({
    data: [
      { id: 0, email: "user1@mail.com", passwordHash: demoPasswordHash, firstName: "Taro", lastName: "Yamada" },
      { id: 1, email: "user2@mail.com", passwordHash: demoPasswordHash, firstName: "Hana", lastName: "Tanaka" },
    ],
    skipDuplicates: true
  })

  // The admin demo account has no cart.
  await prisma.user.createMany({
    data: [
      { id: 2, email: "admin@mail.com", passwordHash: demoPasswordHash, firstName: "Admin", lastName: "Candy", role: "ADMIN" },
    ],
    skipDuplicates: true
  })

  await prisma.user.update({
    where: { id: 0 },
    data: { email: "user1@mail.com", passwordHash: demoPasswordHash }
  })
  await prisma.user.update({
    where: { id: 1 },
    data: { email: "user2@mail.com", passwordHash: demoPasswordHash }
  })
  // Only refresh the demo admin itself; never promote whichever other user happens to hold id 2.
  const adminSlot = await prisma.user.findUnique({ where: { id: 2 }, select: { email: true } })
  if (adminSlot && adminSlot.email !== "admin@mail.com") {
    throw new Error(`User id 2 is reserved for admin@mail.com but belongs to ${adminSlot.email}`)
  }
  await prisma.user.update({
    where: { id: 2, email: "admin@mail.com" },
    data: { passwordHash: demoPasswordHash, role: "ADMIN" }
  })
  // Fill a fictional address only where none is registered, keeping addresses edited in the demo.
  await prisma.user.updateMany({
    where: { id: { in: [0, 1] }, postalCode: null },
    data: { postalCode: "000-0000", prefecture: "東京都", addressLine1: "キャンディ市レイン町1-2-3", addressLine2: "ドロップハイツ101" }
  })

  await prisma.cart.createMany({
    data: [
      { id: 0, userId: 0},
      { id: 1, userId: 1}
    ],
    skipDuplicates: true
  })

  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), COALESCE(MAX(id), 1)) FROM "Product"`
  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"Variant"', 'id'), COALESCE(MAX(id), 1)) FROM "Variant"`
  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE(MAX(id), 1)) FROM "User"`
  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"Cart"', 'id'), COALESCE(MAX(id), 1)) FROM "Cart"`
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => await prisma.$disconnect())
