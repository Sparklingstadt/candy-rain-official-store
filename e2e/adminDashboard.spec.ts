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
  const result = await database.query<{ orders: number, total: number, paid: number, paidOrders: number }>(
    `SELECT count(*)::int AS orders, COALESCE(sum("totalPrice"), 0)::int AS total,
     COALESCE(sum("totalPrice") FILTER (WHERE "paymentStatus" = '支払い済み'), 0)::int AS paid,
     count(*) FILTER (WHERE "paymentStatus" = '支払い済み')::int AS "paidOrders" FROM "Order"
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

test("表示される数が DB の集計と一致する", async ({ page, admin, shopper, database }) => {
  // Orders on both sides of Japan-time midnight (and a cancelled one) make today and this month differ, so swapped
  // or UTC-based boundaries would show the wrong figures. The shopper fixture deletes these orders afterwards.
  const insert = (orderedAt: string, totalPrice: number, shippingStatus = "未発送", paymentStatus = "支払い待ち") => database.query(
    `INSERT INTO "Order" ("userId", "paymentStatus", "shippingStatus", "shippingPrice", "totalPrice", "orderedAt")
     VALUES ($1, $4, $2, 1000, $3, ${orderedAt})`, [shopper.id, shippingStatus, totalPrice, paymentStatus])
  await insert(`${tokyoStart("day")} + interval '1 second'`, 1111)
  await insert(`${tokyoStart("day")} - interval '1 second'`, 2222)
  await insert(`${tokyoStart("day")} + interval '2 seconds'`, 4444, "キャンセル")
  for (const [index, status] of ["支払い済み", "決済エラー", "返金済み", "返金エラー"].entries()) {
    await insert(`${tokyoStart("day")} + interval '3 seconds'`, 5000 + index, "未発送", status)
    await insert(`${tokyoStart("day")} + interval '4 seconds'`, 9000 + index, "キャンセル", status)
  }
  await insert(`${tokyoStart("day")} - interval '1 second'`, 7777, "未発送", "支払い済み")
  const isFirstOfMonth = (await count(database, `SELECT (${tokyoStart("day")} = ${tokyoStart("month")})::int`)) === 1

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
  // The order just before midnight belongs to yesterday, so the month total exceeds today's (except on the 1st).
  if (!isFirstOfMonth) expect(month.total).toBeGreaterThan(today.total)
  expect(today.orders).toBeGreaterThan(0)

  await page.goto("/admin/dashboard")
  expect(await stat(page, "対応待ち", "未発送")).toBe(`${expected.unshipped} 件`)
  expect(await stat(page, "対応待ち", "発送準備中")).toBe(`${expected.preparing} 件`)
  expect(await stat(page, "対応待ち", "返金エラー")).toBe(`${expected.refundErrors} 件`)
  expect(await stat(page, "対応待ち", "売り切れ")).toBe(`${expected.soldOut} 件`)
  expect(await stat(page, "注文と売上", "今日の注文総額")).toBe(yen(today.total))
  expect(await stat(page, "注文と売上", "今月の注文総額")).toBe(yen(month.total))
  expect(await stat(page, "注文と売上", "今日の決済済み売上")).toBe(yen(today.paid))
  expect(await stat(page, "注文と売上", "今月の決済済み売上")).toBe(yen(month.paid))
  const sales = page.getByRole("region", { name: "注文と売上" })
  for (const [period, figures] of [["今日", today], ["今月", month]] as const) {
    await expect(sales.getByText(`${period}の注文総額`, { exact: true }).locator("xpath=..")).toContainText(`${figures.orders} 件・未決済を含む`)
    await expect(sales.getByText(`${period}の決済済み売上`, { exact: true }).locator("xpath=..")).toContainText(`${figures.paidOrders} 件・支払い済みのみ`)
  }
  await expect(page.getByRole("columnheader", { name: "決済状態" }).first()).toBeVisible()
  expect(await stat(page, "商品の状態", "公開中")).toBe(`${expected.published} 件`)
  expect(await stat(page, "商品の状態", "非公開")).toBe(`${expected.unpublished} 件`)
  expect(await stat(page, "商品の状態", "ストアに未表示")).toBe(`${expected.notListed} 件`)
  expect(await stat(page, "商品の状態", "登録数")).toBe(`${expected.products} / 30 件`)
})

test("注文すると最新の注文と未発送・今日の注文総額に反映され、キャンセルすると注文総額から外れる", async ({ page, shopper, admin, browser, database }) => {
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
    expect(await stat(adminPage, "注文と売上", "今日の注文総額")).toBe(yen(salesBefore.total + rows[0].total))
    // Demo checkout is unpaid: it increases order value but never paid sales.
    expect(await stat(adminPage, "注文と売上", "今日の決済済み売上")).toBe(yen(salesBefore.paid))

    await latest.getByRole("link", { name: `#${orderId}` }).click()
    await adminPage.getByLabel("在庫を戻し、返金することを確認しました").check()
    await adminPage.getByRole("button", { name: "注文をキャンセル" }).click()
    await expect(adminPage.getByText("注文をキャンセルしました")).toBeVisible()
    await adminPage.goto("/admin/dashboard")
    expect(await stat(adminPage, "注文と売上", "今日の注文総額")).toBe(yen(salesBefore.total))
    expect(await stat(adminPage, "注文と売上", "今日の決済済み売上")).toBe(yen(salesBefore.paid))
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
