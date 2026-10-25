import { test, expect } from "./fixtures/store"

test("管理者はサインイン後に注文管理へ移動し、ストアのページは開けない", async ({ page, admin }) => {
  await admin.signIn(page)
  await expect(page).toHaveURL(/\/admin\/orders$/)
  await expect(page.getByRole("heading", { name: "注文管理", exact: true })).toBeVisible()
  await page.goto("/products")
  await expect(page).toHaveURL(/\/admin\/orders$/)
  await page.goto("/signin")
  await expect(page).toHaveURL(/\/admin\/orders$/)
})

test("顧客は管理画面を開けない", async ({ page, shopper }) => {
  await shopper.signIn(page)
  await page.goto("/admin/orders")
  await expect(page).toHaveURL(/\/products$/)
})

test("未サインインで管理画面を開くとサインイン画面へ移動する", async ({ page }) => {
  await page.goto("/admin/orders")
  await expect(page).toHaveURL(/\/signin$/)
})

test("管理者が未定義の URL を開いても、カートがなくてもエラーにならず not-found を表示する", async ({ page, admin }) => {
  await admin.signIn(page)
  const response = await page.goto("/admin/no-such-page")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: /ページが見つかりません|注文が見つかりません/ })).toBeVisible()
})
