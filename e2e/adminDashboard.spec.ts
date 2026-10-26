import type { Page } from "@playwright/test"
import type pg from "pg"
import { test, expect } from "./fixtures/store"

type Shopper = { signIn: (page: Page) => Promise<void> }

// Japan-time day/month starts as UTC timestamps, matching how Prisma stores orderedAt.
const tokyoStart = (unit: "day" | "month") =>
  `(date_trunc('${unit}', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'UTC'`

async function count(database: pg.Pool, sql: string) {
  const result = await database.query<{ n: number }>(`SELECT (${sql})::int AS n`)
  return result.rows[0].n
}

async function salesSince(database: pg.Pool, unit: "day" | "month") {
  const result = await database.query<{ orders: number, total: number }>(
    `SELECT count(*)::int AS orders, COALESCE(sum("totalPrice"), 0)::int AS total FROM "Order"
     WHERE "orderedAt" >= ${tokyoStart(unit)} AND "shippingStatus" <> 'キャンセル'`,
  )
  return result.rows[0]
}

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`

// Reads the figure shown under a stat label such as 「未発送」.
async function stat(page: Page, section: string, label: string) {
  const tile = page.getByRole("region", { name: section }).getByText(label, { exact: true }).locator("xpath=..")
  return (await tile.locator("span").nth(1).innerText()).trim()
}

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

test("未サインインで /admin・/admin/dashboard を開くとサインイン画面へ移動する", async ({ page }) => {
  for (const path of ["/admin", "/admin/dashboard"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/signin$/)
  }
})

test("顧客はダッシュボードを開けない", async ({ page, shopper }) => {
  await shopper.signIn(page)
  await page.goto("/admin/dashboard")
  await expect(page).toHaveURL(/\/products$/)
})

test("管理者は /admin とロゴのリンクからダッシュボードを開ける", async ({ page, admin }) => {
  await admin.signIn(page)
  await page.goto("/admin/orders")
  await page.goto("/admin")
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await page.goto("/admin/products")
  await page.getByRole("banner").getByRole("link").first().click()
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(page.getByRole("heading", { name: "ダッシュボード", exact: true })).toBeVisible()
})

test("表示される数が DB の集計と一致する", async ({ page, admin, database }) => {
  await admin.signIn(page)
  const listed = `p."isPublished" AND EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p.id AND v."isPublished")`
  const expected = {
    unshipped: await count(database, `SELECT count(*) FROM "Order" WHERE "shippingStatus" = '未発送'`),
    preparing: await count(database, `SELECT count(*) FROM "Order" WHERE "shippingStatus" = '発送準備中'`),
    refundErrors: await count(database, `SELECT count(*) FROM "Order" WHERE "paymentStatus" = '返金エラー'`),
    soldOut: await count(database, `SELECT count(*) FROM "Variant" v JOIN "Product" p ON p.id = v."productId" WHERE v.stock <= 0 AND v."isPublished" AND p."isPublished"`),
    published: await count(database, `SELECT count(*) FROM "Product" p WHERE ${listed}`),
    unpublished: await count(database, `SELECT count(*) FROM "Product" p WHERE NOT p."isPublished"`),
    notListed: await count(database, `SELECT count(*) FROM "Product" p WHERE p."isPublished" AND NOT (${listed})`),
    products: await count(database, `SELECT count(*) FROM "Product"`),
  }
  const today = await salesSince(database, "day")
  const month = await salesSince(database, "month")

  await page.goto("/admin/dashboard")
  expect(await stat(page, "対応待ち", "未発送")).toBe(`${expected.unshipped} 件`)
  expect(await stat(page, "対応待ち", "発送準備中")).toBe(`${expected.preparing} 件`)
  expect(await stat(page, "対応待ち", "返金エラー")).toBe(`${expected.refundErrors} 件`)
  expect(await stat(page, "対応待ち", "売り切れ")).toBe(`${expected.soldOut} 件`)
  expect(await stat(page, "売上", "今日の注文")).toBe(`${today.orders} 件`)
  expect(await stat(page, "売上", "今日の売上")).toBe(yen(today.total))
  expect(await stat(page, "売上", "今月の注文")).toBe(`${month.orders} 件`)
  expect(await stat(page, "売上", "今月の売上")).toBe(yen(month.total))
  expect(await stat(page, "商品の状態", "公開中")).toBe(`${expected.published} 件`)
  expect(await stat(page, "商品の状態", "非公開")).toBe(`${expected.unpublished} 件`)
  expect(await stat(page, "商品の状態", "ストアに未表示")).toBe(`${expected.notListed} 件`)
  expect(await stat(page, "商品の状態", "登録数")).toBe(`${expected.products} / 30 件`)
})

test("注文すると最新の注文と未発送・今日の売上に反映され、キャンセルすると売上から外れる", async ({ page, shopper, admin, browser, database }) => {
  const adminContext = await browser.newContext()
  try {
    const adminPage = await adminContext.newPage()
    await admin.signIn(adminPage)
    const unshippedBefore = await stat(adminPage, "対応待ち", "未発送")
    const salesBefore = await salesSince(database, "day")

    const orderId = await placeOrderAs(shopper, page)
    const { rows } = await database.query<{ total: number }>('SELECT "totalPrice" AS total FROM "Order" WHERE id = $1', [orderId])

    await adminPage.reload()
    const latest = adminPage.getByRole("table", { name: "最新の注文" }).getByRole("row").nth(1)
    await expect(latest).toContainText(`#${orderId}`)
    await expect(latest).toContainText("未発送")
    expect(await stat(adminPage, "対応待ち", "未発送")).toBe(`${Number.parseInt(unshippedBefore) + 1} 件`)
    expect(await stat(adminPage, "売上", "今日の売上")).toBe(yen(salesBefore.total + rows[0].total))

    await latest.getByRole("link", { name: `#${orderId}` }).click()
    await adminPage.getByLabel("在庫を戻し、返金することを確認しました").check()
    await adminPage.getByRole("button", { name: "注文をキャンセル" }).click()
    await expect(adminPage.getByText("注文をキャンセルしました")).toBeVisible()
    await adminPage.goto("/admin/dashboard")
    expect(await stat(adminPage, "売上", "今日の売上")).toBe(yen(salesBefore.total))
    expect(await stat(adminPage, "対応待ち", "未発送")).toBe(unshippedBefore)
  } finally {
    await adminContext.close()
  }
})

test("非公開の売り切れバリエーションは売り切れの数に入らない", async ({ page, admin, database, seedVariant1 }) => {
  void seedVariant1
  await admin.signIn(page)
  const before = Number.parseInt(await stat(page, "対応待ち", "売り切れ"))
  try {
    await database.query('UPDATE "Variant" SET stock = 0 WHERE id = 1')
    await page.reload()
    expect(await stat(page, "対応待ち", "売り切れ")).toBe(`${before + 1} 件`)
    await database.query('UPDATE "Variant" SET "isPublished" = false WHERE id = 1')
    await page.reload()
    expect(await stat(page, "対応待ち", "売り切れ")).toBe(`${before} 件`)
  } finally {
    await database.query('UPDATE "Variant" SET "isPublished" = true WHERE id = 1')
  }
})
