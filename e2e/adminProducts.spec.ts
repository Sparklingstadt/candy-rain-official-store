import type { Browser, Page } from "@playwright/test"
import { test, expect } from "./fixtures/store"

type Shopper = { signIn: (page: Page) => Promise<void> }

// Registers a product with one variant through the admin screens; it stays hidden until published.
async function registerProduct(page: Page, name: string) {
  await page.goto("/admin/products")
  await page.getByRole("link", { name: "商品を登録" }).click()
  await page.getByLabel("商品名").fill(name)
  await page.getByLabel("説明").fill("E2E で登録した商品です")
  await page.getByLabel("販売区分").selectOption({ label: "受注販売" })
  await page.getByRole("radio", { name: "クリアファイル（商品画像）" }).check()
  await page.getByRole("button", { name: "登録する" }).click()
  await expect(page.getByText("登録しました。バリエーションを追加して公開してください")).toBeVisible()
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
  const productUrl = new URL(page.url()).pathname

  await page.getByRole("link", { name: "バリエーションを追加" }).click()
  await page.getByLabel("バリエーション名").fill(`${name} ミント`)
  await page.getByLabel("価格（円）").fill("1200")
  await page.getByLabel("初期在庫").fill("5")
  await page.getByRole("radio", { name: "クリアファイル A" }).check()
  await page.getByRole("button", { name: "追加する" }).click()
  await expect(page).toHaveURL(new RegExp(`${productUrl}$`))
  await expect(page.getByRole("row", { name: new RegExp(`${name} ミント`) })).toContainText("非公開")
  return { productUrl, productId: Number(productUrl.split("/").pop()) }
}

// The detail page streams behind loading.tsx, so notFound() renders the 404 screen after a 200 status.
async function expectStoreNotFound(page: Page, productId: number) {
  await page.goto(`/products/${productId}`)
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible()
}

async function publish(page: Page, targetName: string) {
  await page.getByRole("button", { name: `${targetName}を公開する` }).click()
  await expect(page.getByRole("button", { name: `${targetName}を非公開にする` })).toBeVisible()
}

async function withShopper(browser: Browser, shopper: Shopper, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await shopper.signIn(page)
    await run(page)
  } finally {
    await context.close()
  }
}

test("顧客は商品の管理画面を開けない", async ({ page, shopper }) => {
  await shopper.signIn(page)
  await page.goto("/admin/products")
  await expect(page).toHaveURL(/\/products$/)
})

test("登録した商品は非公開でストアに出ず、公開するとストアで購入できる", async ({ page, admin, shopper, browser, e2eProduct }) => {
  await admin.signIn(page)
  const { productId } = await registerProduct(page, e2eProduct.name)

  await withShopper(browser, shopper, async shopperPage => {
    await expect(shopperPage.getByRole("link", { name: new RegExp(e2eProduct.name) })).toHaveCount(0)
    await expectStoreNotFound(shopperPage, productId)
  })

  await publish(page, e2eProduct.name)
  await expect(page.getByText("公開中のバリエーションがないため、ストアには表示されません")).toBeVisible()
  await publish(page, `${e2eProduct.name} ミント`)
  await expect(page.getByText("公開中のバリエーションがないため、ストアには表示されません")).toHaveCount(0)

  await withShopper(browser, shopper, async shopperPage => {
    await shopperPage.getByRole("link", { name: new RegExp(e2eProduct.name) }).first().click()
    await expect(shopperPage.getByRole("heading", { name: e2eProduct.name })).toBeVisible()
    await expect(shopperPage.getByText("E2E で登録した商品です")).toBeVisible()
    await shopperPage.getByRole("button", { name: "カートに追加" }).click()
    await expect(shopperPage.getByRole("link", { name: "カート(1)" })).toBeVisible()
  })
})

test("商品を非公開にすると詳細は 404、カートは「販売停止」になり注文確定でエラーになる", async ({ page, admin, shopper, browser, e2eProduct }) => {
  await admin.signIn(page)
  const { productId } = await registerProduct(page, e2eProduct.name)
  await publish(page, e2eProduct.name)
  await publish(page, `${e2eProduct.name} ミント`)

  const shopperContext = await browser.newContext()
  try {
    const shopperPage = await shopperContext.newPage()
    await shopper.signIn(shopperPage)
    await shopperPage.goto(`/products/${productId}`)
    await shopperPage.getByRole("button", { name: "カートに追加" }).click()
    await expect(shopperPage.getByRole("link", { name: "カート(1)" })).toBeVisible()

    await page.getByRole("button", { name: `${e2eProduct.name}を非公開にする` }).click()
    await expect(page.getByRole("button", { name: `${e2eProduct.name}を公開する` })).toBeVisible()

    await expectStoreNotFound(shopperPage, productId)
    await shopperPage.goto("/cart")
    await expect(shopperPage.getByText("販売停止").first()).toBeVisible()
    await shopperPage.getByRole("button", { name: "注文を確定する", exact: true }).click()
    await expect(shopperPage.getByText(`販売を停止した商品がカートに含まれています: ${e2eProduct.name} ミント`)).toBeVisible()
    await expect(shopperPage).toHaveURL(/\/cart$/)
  } finally {
    await shopperContext.close()
  }
})

test("商品情報・バリエーション名・画像の変更がストアに反映される", async ({ page, admin, shopper, browser, e2eProduct }) => {
  await admin.signIn(page)
  const { productId, productUrl } = await registerProduct(page, e2eProduct.name)
  await publish(page, e2eProduct.name)
  await publish(page, `${e2eProduct.name} ミント`)

  const renamed = `${e2eProduct.name} 改`
  await page.getByLabel("商品名").fill(renamed)
  await page.getByLabel("説明").fill("説明を変更しました\n2行目")
  await page.getByRole("radio", { name: "タペストリー（商品画像）" }).check()
  await page.getByRole("button", { name: "保存する" }).click()
  await expect(page.getByText("商品情報を保存しました")).toBeVisible()
  await expect(page.getByRole("heading", { name: renamed, exact: true })).toBeVisible()

  await page.getByRole("link", { name: `${e2eProduct.name} ミントを編集` }).click()
  await page.getByLabel("バリエーション名").fill(`${e2eProduct.name} レモン`)
  await page.getByRole("radio", { name: "タペストリー A" }).check()
  await page.getByRole("button", { name: "保存する" }).click()
  await expect(page.getByText("バリエーションを保存しました")).toBeVisible()
  await page.goto(productUrl)
  await expect(page.getByRole("row", { name: new RegExp(`${e2eProduct.name} レモン`) })).toBeVisible()

  await withShopper(browser, shopper, async shopperPage => {
    await shopperPage.goto(`/products/${productId}`)
    await expect(shopperPage.getByRole("heading", { name: renamed })).toBeVisible()
    // Line breaks typed into the description textarea are kept on the store page.
    expect(await shopperPage.getByText("説明を変更しました").innerText()).toBe("説明を変更しました\n2行目")
    await expect(shopperPage.getByRole("button", { name: new RegExp(`${e2eProduct.name} レモン`) })).toBeVisible()
    await expect(shopperPage.locator('img[src*="product-3.webp"]').first()).toBeAttached()
    await expect(shopperPage.locator('img[src*="variant-6.webp"]').first()).toBeAttached()
  })
})

test("入力エラーは項目ごとに表示され、入力値が残る", async ({ page, admin }) => {
  await admin.signIn(page)
  await page.goto("/admin/products/new")
  // Bypass the browser's own checks so the server-side validation answers.
  await page.locator("form").evaluate(form => { (form as HTMLFormElement).noValidate = true })
  await page.getByLabel("商品名").fill("  ")
  await page.getByLabel("カテゴリ").evaluate(input => input.removeAttribute("maxlength"))
  await page.getByLabel("カテゴリ").fill("あ".repeat(31))
  await page.getByLabel("説明").fill("残しておく説明")
  await page.getByRole("button", { name: "登録する" }).click()

  await expect(page.getByText("商品名を入力してください")).toBeVisible()
  await expect(page.getByText("カテゴリは30文字以内で入力してください")).toBeVisible()
  await expect(page.getByText("画像を選択してください")).toBeVisible()
  await expect(page.getByRole("alert").filter({ hasText: "入力内容を確認してください" })).toBeVisible()
  await expect(page.getByLabel("説明")).toHaveValue("残しておく説明")
  await expect(page).toHaveURL(/\/admin\/products\/new$/)
})

test("商品一覧はカード表示が既定で、リスト表示と切り替えられる", async ({ page, admin }) => {
  await admin.signIn(page)
  await page.goto("/admin/products")
  const toggle = page.getByRole("navigation", { name: "表示の切り替え" })
  await expect(toggle.getByRole("link", { name: "カード" })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("table")).toHaveCount(0)
  const card = page.getByRole("link", { name: /ランダム缶バッジ/ })
  await expect(card).toContainText("公開中")
  await expect(card).toContainText("事前販売")

  await toggle.getByRole("link", { name: "リスト" }).click()
  await expect(page).toHaveURL(/\/admin\/products\?view=list$/)
  await expect(toggle.getByRole("link", { name: "リスト" })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("row", { name: /ランダム缶バッジ/ })).toContainText("公開中")

  await toggle.getByRole("link", { name: "カード" }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await page.getByRole("link", { name: /ランダム缶バッジ/ }).click()
  await expect(page).toHaveURL(/\/admin\/products\/0$/)
})
