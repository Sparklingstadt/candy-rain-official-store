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

test("管理者はサインイン後にダッシュボードへ移動し、ストアのページは開けない", async ({ page, admin }) => {
  await admin.signIn(page)
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(page.getByRole("heading", { name: "ダッシュボード", exact: true })).toBeVisible()
  await page.goto("/products")
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await page.goto("/signin")
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
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

test("管理者が未定義の URL を開くと、カートがなくても 404 の「ページが見つかりません」を表示する", async ({ page, admin }) => {
  await admin.signIn(page)
  const response = await page.goto("/admin/no-such-page")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible()
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

async function readVariant(database: pg.Pool, variantId: number): Promise<{ stock: number, price: number }> {
  const result = await database.query<{ stock: number, price: number }>('SELECT stock, price FROM "Variant" WHERE id = $1', [variantId])
  return result.rows[0]
}

test("顧客は在庫・価格の画面を開けない", async ({ page, shopper }) => {
  await shopper.signIn(page)
  await page.goto("/admin/inventory")
  await expect(page).toHaveURL(/\/products$/)
})

test("管理者が在庫を増やすと売り切れが解除される。0 未満の減算は拒否される", async ({ page, shopper, admin, browser, database, seedVariant1 }) => {
  void seedVariant1
  await database.query('UPDATE "Variant" SET stock = 0 WHERE id = 1')
  await admin.signIn(page)
  await page.getByRole("link", { name: "在庫・価格" }).click()
  await expect(page).toHaveURL(/\/admin\/inventory$/)
  const row = page.getByRole("row", { name: /クリアファイル A/ })
  await expect(row).toContainText("売り切れ")
  await row.getByLabel("クリアファイル Aの在庫の増減").fill("-1")
  await row.getByRole("button", { name: "在庫を更新" }).click()
  await expect(row.getByText("在庫が足りないため減らせません（現在の在庫: 0）")).toBeVisible()
  expect((await readVariant(database, 1)).stock).toBe(0)
  await row.getByLabel("クリアファイル Aの在庫の増減").fill("+5")
  await row.getByRole("button", { name: "在庫を更新" }).click()
  await expect(row.getByText("在庫を 5 に更新しました")).toBeVisible()
  await expect(row).not.toContainText("売り切れ")
  expect((await readVariant(database, 1)).stock).toBe(5)

  const shopperContext = await browser.newContext()
  try {
    const shopperPage = await shopperContext.newPage()
    await shopper.signIn(shopperPage)
    await shopperPage.goto("/products/1")
    const variantButton = shopperPage.getByRole("button", { name: /^クリアファイル A(?!の)/ })
    await expect(variantButton).toBeEnabled()
    await expect(variantButton).not.toContainText("売り切れ")
  } finally {
    await shopperContext.close()
  }
})

test("管理者が価格を変えると商品ページとカートに反映される", async ({ page, shopper, admin, browser, database, seedVariant1 }) => {
  void seedVariant1
  await admin.signIn(page)
  await page.goto("/admin/inventory")
  const row = page.getByRole("row", { name: /クリアファイル A/ })
  const update = row.getByRole("button", { name: "価格を更新" })
  await expect(update).toBeDisabled()
  await row.getByLabel("クリアファイル Aの価格", { exact: true }).fill("900")
  await update.click()
  await expect(row.getByText("価格を ¥900 に更新しました")).toBeVisible()
  expect((await readVariant(database, 1)).price).toBe(900)

  const shopperContext = await browser.newContext()
  try {
    const shopperPage = await shopperContext.newPage()
    await shopper.signIn(shopperPage)
    await shopperPage.goto("/products/1")
    const variantButton = shopperPage.getByRole("button", { name: /^クリアファイル A(?!の)/ })
    await expect(variantButton).toContainText("¥900")
    await variantButton.click()
    await shopperPage.getByRole("button", { name: "カートに追加" }).click()
    await expect(shopperPage.getByRole("link", { name: "カート(1)" })).toBeVisible()
    await shopperPage.getByRole("link", { name: "カート(1)" }).click()
    await expect(shopperPage.getByText("¥900").first()).toBeVisible()
  } finally {
    await shopperContext.close()
  }
})

test("購入後に価格を変えても、注文には購入時の価格が残る", async ({ page, shopper, admin, browser, database, seedVariant1 }) => {
  void seedVariant1
  await shopper.signIn(page)
  await page.goto("/products/1")
  await page.getByRole("button", { name: /^クリアファイル A(?!の)/ }).click()
  await page.getByRole("button", { name: "カートに追加" }).click()
  await page.getByRole("link", { name: "カート(1)" }).click()
  await page.getByRole("button", { name: "注文を確定する", exact: true }).click()
  await expect(page).toHaveURL(/\/orders\/\d+/)
  const orderId = Number(new URL(page.url()).pathname.split("/").at(-1))
  const orderUrl = `/orders/${orderId}`

  const adminContext = await browser.newContext()
  try {
    const adminPage = await adminContext.newPage()
    await admin.signIn(adminPage)
    await adminPage.goto("/admin/inventory")
    const row = adminPage.getByRole("row", { name: /クリアファイル A/ })
    await row.getByLabel("クリアファイル Aの価格", { exact: true }).fill("1200")
    await row.getByRole("button", { name: "価格を更新" }).click()
    await expect(row.getByText("価格を ¥1,200 に更新しました")).toBeVisible()
    await adminPage.goto(`/admin/orders/${orderId}`)
    await expect(adminPage.getByRole("main")).toContainText("¥800")
    await expect(adminPage.getByRole("main")).not.toContainText("¥1,200")
  } finally {
    await adminContext.close()
  }

  await page.goto(orderUrl)
  const main = page.getByRole("main")
  await expect(main).toContainText("¥800")
  await expect(main).toContainText("¥1,800")
  await expect(main).not.toContainText("¥1,200")
  const stored = await database.query<{ priceAtPurchase: number }>('SELECT "priceAtPurchase" FROM "OrderItem" WHERE "orderId" = $1', [orderId])
  expect(stored.rows.map(row => row.priceAtPurchase)).toEqual([800])
})

test("別の管理者が先に価格を変えていたら、編集中の価格で上書きしない", async ({ page, admin, database, seedVariant1 }) => {
  void seedVariant1
  await admin.signIn(page)
  await page.goto("/admin/inventory")
  const row = page.getByRole("row", { name: /クリアファイル A/ })
  const priceField = row.getByLabel("クリアファイル Aの価格", { exact: true })
  const update = row.getByRole("button", { name: "価格を更新" })
  // Another admin changes the price, then this page revalidates through a stock update in the same row.
  const changeElsewhereAndRevalidate = async (price: number) => {
    await database.query('UPDATE "Variant" SET price = $1 WHERE id = 1', [price])
    await row.getByLabel("クリアファイル Aの在庫の増減").fill("+1")
    await row.getByRole("button", { name: "在庫を更新" }).click()
    await expect(row).toContainText(`¥${price.toLocaleString("ja-JP")}`)
  }

  // An untouched field follows the new price.
  await changeElsewhereAndRevalidate(850)
  await expect(priceField).toHaveValue("850")
  await expect(update).toBeDisabled()

  // An edited field keeps the edit, and submitting it is rejected instead of reverting 900.
  await priceField.fill("1000")
  await changeElsewhereAndRevalidate(900)
  await expect(priceField).toHaveValue("1000")
  await update.click()
  await expect(row.getByText("価格が別の操作で更新されています。最新の状態を確認してください")).toBeVisible()
  expect((await readVariant(database, 1)).price).toBe(900)

  // After seeing the error, the admin can submit again on top of the latest price.
  await update.click()
  await expect(row.getByText("価格を ¥1,000 に更新しました")).toBeVisible()
  expect((await readVariant(database, 1)).price).toBe(1000)
})

test("390px 幅で管理ヘッダーが横にはみ出さない", async ({ page, admin }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await admin.signIn(page)
  for (const path of ["/admin/orders", "/admin/products", "/admin/inventory"]) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole("button", { name: "サインアウト" })).toBeInViewport()
  }
})
