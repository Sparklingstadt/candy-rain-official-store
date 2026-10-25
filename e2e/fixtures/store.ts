import "dotenv/config"
import { randomUUID } from "node:crypto"
import { test as base, expect, type Page } from "@playwright/test"
import pg from "pg"

type Shopper = { id: number; email: string; signIn: (page: Page) => Promise<void> }
type Admin = { email: string; signIn: (page: Page) => Promise<void> }

export const test = base.extend<{ shopper: Shopper; admin: Admin; database: pg.Pool }>({
  database: async ({}, provide) => {
    const database = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    try { await provide(database) } finally { await database.end() }
  },
  // The seeded admin account is shared and read-only here, so there is nothing to create or clean up.
  admin: async ({}, provide) => {
    const email = "admin@mail.com"
    await provide({ email, signIn: async page => {
      await page.goto("/signin")
      await page.getByLabel("メールアドレス", { exact: true }).fill(email)
      await page.getByLabel("パスワード", { exact: true }).fill("demo-password")
      await page.getByRole("button", { name: "サインイン", exact: true }).click()
      await expect(page).toHaveURL(/\/admin\/orders$/)
    } })
  },
  shopper: async ({ database }, provide) => {
    const email = `e2e-${randomUUID()}@example.test`
    const result = await database.query<{ id: number }>(
      `INSERT INTO "User" (email, "passwordHash", "firstName", "lastName")
       SELECT $1, "passwordHash", 'Test', 'Shopper' FROM "User" WHERE id = 0 RETURNING id`, [email],
    )
    if (!result.rows[0]) throw new Error("Run npm run db:seed before E2E tests")
    const id = result.rows[0].id
    try {
      await database.query('INSERT INTO "Cart" ("userId") VALUES ($1)', [id])
      await provide({ id, email, signIn: async page => {
        await page.goto("/signin")
        await page.getByLabel("メールアドレス", { exact: true }).fill(email)
        await page.getByLabel("パスワード", { exact: true }).fill("demo-password")
        await page.getByRole("button", { name: "サインイン", exact: true }).click()
        await expect(page).toHaveURL(/\/products$/)
        await expect(page.getByRole("heading", { name: "商品一覧", exact: true })).toBeVisible()
      } })
    } finally {
      // Restore only stock purchased by this fixture; leave other shoppers' data intact.
      await database.query(`UPDATE "Variant" v SET stock = stock + bought.quantity
        FROM (SELECT oi."variantId", SUM(oi.quantity)::int AS quantity FROM "OrderItem" oi
          JOIN "Order" o ON o.id = oi."orderId" WHERE o."userId" = $1 GROUP BY oi."variantId") bought
        WHERE v.id = bought."variantId"`, [id])
      await database.query('DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "userId" = $1)', [id])
      await database.query('DELETE FROM "Order" WHERE "userId" = $1', [id])
      await database.query('DELETE FROM "CartItem" WHERE "cartId" IN (SELECT id FROM "Cart" WHERE "userId" = $1)', [id])
      await database.query('DELETE FROM "Cart" WHERE "userId" = $1', [id])
      await database.query('DELETE FROM "User" WHERE id = $1', [id])
    }
  },
})

export { expect }
