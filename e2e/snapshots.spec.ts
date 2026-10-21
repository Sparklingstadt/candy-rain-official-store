import { test, expect } from "./fixtures/store"

// ARIA baselines are portable between local macOS and Linux CI. Each route
// starts with a fresh shopper, so carts, orders and user IDs cannot leak across tests.
for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(`ページスナップショット / ${viewport.name} (#12)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    for (const route of [
      { name: "products", path: "/products", ready: "商品一覧" },
      { name: "product", path: "/products/1", ready: "クリアファイル" },
      { name: "cart", path: "/cart", ready: "買い物かご" },
      { name: "orders", path: "/orders", ready: "注文履歴" },
      { name: "account", path: "/account", ready: "Test Shopper" },
    ]) {
      test(route.name, async ({ page, shopper }) => {
        await shopper.signIn(page)
        await page.goto(route.path)
        await expect(page.getByRole("heading", { name: route.ready, exact: true })).toBeVisible()
        await expect(page.locator('main [data-slot="skeleton"]')).toHaveCount(0)
        await expect(page.getByRole("main")).toMatchAriaSnapshot({ name: `${route.name}-${viewport.name}.aria.yml` })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      })
    }
    test("signin", async ({ page }) => {
      await page.goto("/signin")
      await expect(page.getByRole("button", { name: "サインイン", exact: true })).toBeVisible()
      await expect(page.getByRole("main")).toMatchAriaSnapshot({ name: `signin-${viewport.name}.aria.yml` })
    })
    test("order-detail", async ({ page, shopper, database }) => {
      await shopper.signIn(page)
      await page.goto("/products/0")
      await page.getByRole("button", { name: "カートに追加" }).click()
      await expect(page.getByRole("link", { name: "カート(1)" })).toBeVisible()
      await page.goto("/cart")
      await page.getByRole("button", { name: "注文を確定する", exact: true }).click()
      await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/)
      const result = await database.query<{ id: number }>(
        `UPDATE "Order" SET "orderedAt" = '2026-01-01T00:00:00Z' WHERE "userId" = $1 RETURNING id`,
        [shopper.id],
      )
      await page.goto(`/orders/${result.rows[0].id}`)
      await expect(page.getByRole("heading", { name: /^注文 #\d+$/ })).toBeVisible()
      await expect(page.getByRole("main")).toMatchAriaSnapshot({ name: `order-detail-${viewport.name}.aria.yml` })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
    test("signout", async ({ page, shopper }) => {
      await shopper.signIn(page)
      await page.goto("/account")
      await page.getByRole("button", { name: "サインアウト", exact: true }).click()
      await expect(page.getByRole("heading", { name: "サインアウトしました" })).toBeVisible()
      await expect(page.getByRole("main")).toMatchAriaSnapshot({ name: `signout-${viewport.name}.aria.yml` })
    })
  })
}
