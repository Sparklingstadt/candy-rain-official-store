import type { Page } from "@playwright/test"
import type pg from "pg"
import { test, expect } from "./fixtures/store"

type Shopper = { signIn: (page: Page) => Promise<void> }

// Signs the shopper in, buys the first product and returns the new order id taken from /orders/{id}.
async function placeOrderAs(shopper: Shopper, page: Page): Promise<number> {
  await shopper.signIn(page)
  await page.getByRole("link", { name: /ランダム缶バッジ/ }).click()
  await page.getByRole("button", { name: "カートに追加" }).click()
  await expect(page.getByRole("link", { name: "カート(1)" })).toBeVisible()
  await page.getByRole("link", { name: "カート(1)" }).click()
  await page.getByRole("button", { name: "注文を確定する", exact: true }).click()
  await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/)
  return Number(new URL(page.url()).pathname.split("/").pop())
}

async function stockOfVariant(database: pg.Pool, variantId: number): Promise<number> {
  const result = await database.query<{ stock: number }>('SELECT stock FROM "Variant" WHERE id = $1', [variantId])
  return result.rows[0].stock
}

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

test("管理者は顧客の注文を一覧と詳細で確認できる", async ({ page, shopper, admin, browser }) => {
  const orderId = await placeOrderAs(shopper, page)
  const adminContext = await browser.newContext()
  try {
    const adminPage = await adminContext.newPage()
    await admin.signIn(adminPage)
    const row = adminPage.getByRole("row", { name: new RegExp(`#${orderId}\\b`) })
    await expect(row).toContainText("Shopper Test")
    await expect(row).toContainText("未発送")
    await adminPage.getByRole("link", { name: "発送準備中" }).click()
    await expect(adminPage).toHaveURL(/shippingStatus=preparing$/)
    await expect(adminPage.getByRole("row", { name: new RegExp(`#${orderId}\\b`) })).toHaveCount(0)
    await adminPage.goto(`/admin/orders/${orderId}`)
    await expect(adminPage.getByRole("heading", { name: `注文 #${orderId}` })).toBeVisible()
    await expect(adminPage.getByRole("main")).toContainText(shopper.email)
  } finally {
    await adminContext.close()
  }
})

test("管理者が発送ステータスを変更すると顧客の注文詳細に反映される", async ({ page, shopper, admin, browser }) => {
  const orderId = await placeOrderAs(shopper, page)
  const adminContext = await browser.newContext()
  try {
    const adminPage = await adminContext.newPage()
    await admin.signIn(adminPage)
    await adminPage.goto(`/admin/orders/${orderId}`)
    await expect(adminPage.getByRole("button", { name: "発送ステータスを変更" })).toBeDisabled()
    await adminPage.getByLabel("発送ステータス").selectOption("発送準備中")
    await adminPage.getByRole("button", { name: "発送ステータスを変更" }).click()
    await expect(adminPage.getByText("発送ステータスを「発送準備中」に変更しました")).toBeVisible()
    await page.goto(`/orders/${orderId}`)
    await expect(page.getByRole("main")).toContainText("発送準備中")
  } finally {
    await adminContext.close()
  }
})

test("確認チェックをしてキャンセルすると在庫が戻り、一覧と顧客側にキャンセルと表示される", async ({ page, shopper, admin, browser, database }) => {
  const stockBefore = await stockOfVariant(database, 0)
  const orderId = await placeOrderAs(shopper, page)
  const adminContext = await browser.newContext()
  try {
    const adminPage = await adminContext.newPage()
    await admin.signIn(adminPage)
    await adminPage.goto(`/admin/orders/${orderId}`)
    const cancel = adminPage.getByRole("button", { name: "注文をキャンセル" })
    await expect(cancel).toBeDisabled()
    await adminPage.getByLabel("在庫を戻し、返金することを確認しました").check()
    await cancel.click()
    await expect(adminPage.getByText("注文をキャンセルしました")).toBeVisible()
    await expect(cancel).toHaveCount(0)
    await expect(adminPage.getByLabel("発送ステータス")).toHaveCount(0)
    expect(await stockOfVariant(database, 0)).toBe(stockBefore)
    await adminPage.goto("/admin/orders?shippingStatus=cancelled")
    await expect(adminPage.getByRole("row", { name: new RegExp(`#${orderId}\\b`) })).toContainText("キャンセル")
    await page.goto(`/orders/${orderId}`)
    await expect(page.getByRole("main")).toContainText("キャンセル")
  } finally {
    await adminContext.close()
  }
})

test("不正・存在しない注文 ID は 404 になる", async ({ page, admin }) => {
  await admin.signIn(page)
  for (const id of ["abc", "-1", "999999"]) {
    const response = await page.goto(`/admin/orders/${id}`)
    expect(response?.status()).toBe(404)
    await expect(page.getByText("注文が見つかりません")).toBeVisible()
  }
})
