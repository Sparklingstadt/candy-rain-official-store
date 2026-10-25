import { test, expect } from "./fixtures/store"

test.describe("ページ表示 (#4)", () => {
  test("商品一覧のローディングから商品5件の表示へ切り替わる", async ({ page, shopper, database }) => {
    await shopper.signIn(page)
    const connection = await database.connect()
    try {
      await connection.query("BEGIN")
      // Hold the real query until the streamed Suspense fallback has been observed.
      await connection.query('LOCK TABLE "Product" IN ACCESS EXCLUSIVE MODE')
      await page.goto("/products", { waitUntil: "commit" })
      await expect(page.getByRole("heading", { name: "商品一覧", exact: true })).toBeVisible()
      await expect(page.locator('main [data-slot="skeleton"]')).toHaveCount(3)
      await expect(page.locator('main [data-slot="skeleton"]').first()).toBeVisible()
    } finally {
      await connection.query("ROLLBACK")
      connection.release()
    }
    await expect(page.locator('main [data-slot="skeleton"]')).toHaveCount(0)
    for (const name of ["ランダム缶バッジ", "クリアファイル", "アクリルスタンド", "タペストリー", "オリジナル TEE"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    }
  })

  test("カート・注文履歴・アカウントを表示し、サインアウトでセッションを破棄する", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await page.goto("/cart")
    await expect(page.getByRole("heading", { name: "買い物かご" })).toBeVisible()
    await expect(page.getByText("カートの中は空です")).toBeVisible()
    await page.goto("/orders")
    await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible()
    await expect(page.getByText("注文はまだありません")).toBeVisible()
    await page.goto("/account")
    await expect(page.getByRole("heading", { name: "Test Shopper" })).toBeVisible()
    const prefetch = await page.request.get("/account", { headers: { "next-router-prefetch": "1" } })
    expect(prefetch.ok()).toBe(true)
    expect(Boolean(prefetch.headers()["set-cookie"])).toBe(false)
    await page.getByRole("button", { name: "サインアウト", exact: true }).click()
    await expect(page).toHaveURL(/\/signout$/)
    await expect(page.getByRole("heading", { name: "サインアウトしました" })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("heading", { name: "サインアウトしました" })).toBeVisible()
    expect(Boolean((await (await page.request.get("/api/auth/session")).json())?.user)).toBe(false)
    for (const path of ["/products", "/account"]) {
      const response = await page.request.get(path, {
        headers: { "next-router-prefetch": "1" }, maxRedirects: 0,
      })
      expect([302, 303, 307]).toContain(response.status())
      expect(new URL(response.headers().location, response.url()).pathname).toBe("/signin")
    }
    await page.getByRole("link", { name: "サインインページへ戻る" }).click()
    await expect(page.getByRole("button", { name: "サインイン", exact: true })).toBeVisible()
    await page.goto("/account")
    await expect(page).toHaveURL(/\/signin$/)
  })

  test("購入した注文のID・明細・合計を注文詳細に表示する", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await page.goto("/products/0")
    await page.getByRole("button", { name: "カートに追加" }).click()
    await expect(page.getByRole("link", { name: "カート(1)" })).toBeVisible()
    await page.goto("/cart")
    await page.getByRole("button", { name: "注文を確定する", exact: true }).click()
    await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/)
    const id = new URL(page.url()).pathname.split("/").pop()
    await expect(page.getByRole("status")).toContainText("ご注文ありがとうございます")
    await expect(page.getByRole("heading", { name: `注文 #${id}`, exact: true })).toBeVisible()
    await expect(page.getByRole("row", { name: "ランダム缶バッジ ¥500 1 ¥500" })).toBeVisible()
    await expect(page.getByText("¥1,500", { exact: true })).toBeVisible()
    await page.getByRole("link", { name: "注文一覧へ戻る" }).click()
    await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible()
  })

  test("404 はストアのヘッダー付きで表示される", async ({ page, shopper }) => {
    await shopper.signIn(page)
    for (const path of ["/no-such-page", "/products/999999"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "ページが見つかりません", exact: true })).toBeVisible()
      await expect(page.getByRole("navigation", { name: "メインナビゲーション" })).toBeVisible()
    }
  })
})
