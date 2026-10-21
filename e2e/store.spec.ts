import "dotenv/config"
import { expect, test, type Page } from "@playwright/test"
import pg from "pg"

const database = new pg.Pool({ connectionString: process.env.DATABASE_URL })

test.afterAll(async () => {
  await database.end()
})

async function signIn(page: Page) {
  await page.goto("/signin")
  await page.getByLabel("メールアドレス").fill("user1@mail.com")
  await page.getByLabel("パスワード").fill("demo-password")
  await page.getByRole("button", { name: "サインイン" }).click()
  await expect(page).toHaveURL(/\/products$/)
}

test("未認証ユーザーをサインイン画面へ誘導する", async ({ page }) => {
  await page.goto("/products")

  await expect(page).toHaveURL(/\/signin$/)
  await expect(page.getByRole("button", { name: "サインイン" })).toBeVisible()
})

test("未認証ユーザーを商品詳細からもサインイン画面へ誘導する", async ({ page }) => {
  await page.goto("/products/0")

  await expect(page).toHaveURL(/\/signin$/)
  await expect(page.getByRole("button", { name: "サインイン" })).toBeVisible()
})

test("未認証でも公開商品画像を配信する", async ({ request }) => {
  const sourceImage = await request.get("/products/Rectangle%201.png", { maxRedirects: 0 })
  expect(sourceImage.status()).toBe(200)
  expect(sourceImage.headers()["content-type"]).toBe("image/png")

  const optimizedImage = await request.get(
    "/_next/image?url=%2Fproducts%2FRectangle%201.png&w=640&q=75",
    { maxRedirects: 0 },
  )
  expect(optimizedImage.status()).toBe(200)
  expect(optimizedImage.headers()["content-type"]).toMatch(/^image\//)
})

test("パスワードが正しくない場合はサインインできない", async ({ page }) => {
  await page.goto("/signin")
  await page.getByLabel("メールアドレス").fill("user1@mail.com")
  await page.getByLabel("パスワード").fill("wrong-password")
  await page.getByRole("button", { name: "サインイン" }).click()

  await expect(page).toHaveURL(/\/signin\?error=credentials$/)
  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。", { exact: true })).toBeVisible()
})

test("サインインして商品を購入できる", async ({ page }) => {
  await signIn(page)

  await page.getByRole("link", { name: /ランダム缶バッジ/ }).click()
  await expect(page.getByRole("heading", { name: "ランダム缶バッジ" })).toBeVisible()
  await page.getByRole("button", { name: "カートに追加" }).click()
  await expect(page.getByRole("link", { name: "カート(1)" })).toBeVisible()

  await page.getByRole("link", { name: "カート(1)" }).click()
  await expect(page.getByText("¥1,500", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "注文を確定する", exact: true }).click()

  await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/)
  await expect(page.getByRole("status")).toContainText("ご注文ありがとうございます")
  await page.getByRole("link", { name: "注文一覧へ戻る" }).click()
  await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "¥1,500" })).toBeVisible()
  const orderTable = page.getByRole("table")
  await expect(orderTable.getByText("支払い待ち", { exact: true })).toBeVisible()
  await expect(orderTable.getByText("未発送", { exact: true })).toBeVisible()

  await page.getByRole("link", { name: "カート(0)" }).click()
  await expect(page.getByText("カートの中は空です")).toBeVisible()
})

test("在庫不足を表示し、購入を再試行できる状態に戻す", async ({ page }) => {
  await signIn(page)
  await page.getByRole("link", { name: /ランダム缶バッジ/ }).click()
  await page.getByRole("button", { name: "カートに追加" }).click()
  await database.query('UPDATE "Variant" SET stock = 0 WHERE id = $1', [0])

  try {
    await page.getByRole("link", { name: "カート(1)" }).click()
    await page.getByRole("button", { name: "注文を確定する", exact: true }).click()

    await expect(page.locator('p[role="alert"]')).toContainText("在庫が不足しています")
    await expect(page.getByRole("button", { name: "注文を確定する", exact: true })).toBeEnabled()
    await expect(page).toHaveURL(/\/cart$/)
  } finally {
    await database.query('UPDATE "Variant" SET stock = 50 WHERE id = $1', [0])
  }
})

test("売り切れ商品を表示し、カート追加を無効にする", async ({ page }) => {
  await database.query('UPDATE "Variant" SET stock = 0 WHERE id = $1', [0])

  try {
    await signIn(page)
    await expect(page.getByText("売り切れ", { exact: true }).first()).toBeVisible()
    await page.getByRole("link", { name: /ランダム缶バッジ/ }).click()
    await expect(page.getByRole("button", { name: "売り切れ", exact: true })).toBeDisabled()
  } finally {
    await database.query('UPDATE "Variant" SET stock = 50 WHERE id = $1', [0])
  }
})

test("カートで現在庫を超える数量増加を無効にする", async ({ page }) => {
  await database.query(
    'DELETE FROM "CartItem" WHERE "cartId" = (SELECT id FROM "Cart" WHERE "userId" = $1)',
    [0],
  )
  await database.query('UPDATE "Variant" SET stock = 1 WHERE id = $1', [0])

  try {
    await signIn(page)
    await page.getByRole("link", { name: /ランダム缶バッジ/ }).click()
    await page.getByRole("button", { name: "カートに追加" }).click()
    await page.getByRole("link", { name: "カート(1)" }).click()

    await expect(page.getByText("在庫上限").first()).toBeVisible()
    await expect(page.getByRole("button", { name: "数量を増やす" }).first()).toBeDisabled()
  } finally {
    await database.query(
      'DELETE FROM "CartItem" WHERE "cartId" = (SELECT id FROM "Cart" WHERE "userId" = $1)',
      [0],
    )
    await database.query('UPDATE "Variant" SET stock = 50 WHERE id = $1', [0])
  }
})

test("商品画像を切り替えて全体画像へ戻せる", async ({ page }) => {
  await signIn(page)
  await page.goto("/products/1")
  const gallery = page.getByRole("region", { name: "商品画像" })
  await gallery.getByRole("button", { name: "クリアファイル Bの画像を表示" }).click()
  await expect(gallery.getByRole("img")).toHaveAttribute("alt", "クリアファイル B")
  await expect(gallery.getByRole("img")).toHaveAttribute("src", /variant-2/)
  await gallery.getByRole("button", { name: "クリアファイルの画像を表示" }).click()
  await expect(gallery.getByRole("img")).toHaveAttribute("alt", "クリアファイル")
})
