import { test, expect } from "./fixtures/store"

test.describe("アカウント情報の編集 (#15)", () => {
  test("お届け先を検証して保存し、アカウントに表示する", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await page.goto("/account")
    await expect(page.getByText("お届け先はまだ登録されていません。")).toBeVisible()
    await page.getByRole("link", { name: "お届け先を登録" }).click()

    await page.getByLabel("郵便番号").fill("123-45")
    await page.getByLabel("都道府県").selectOption("大阪府")
    await page.getByLabel("市区町村・番地").fill("キャンディ市レイン町1-2-3")
    await page.getByRole("button", { name: "お届け先を保存" }).click()
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("入力内容を確認してください")
    await expect(page.getByLabel("郵便番号")).toHaveAccessibleDescription(/7桁の数字/)
    await expect(page.getByLabel("郵便番号")).toHaveValue("123-45")
    await expect(page.getByLabel("都道府県")).toHaveValue("大阪府")
    await expect(page.getByLabel("市区町村・番地")).toHaveValue("キャンディ市レイン町1-2-3")

    await page.getByLabel("郵便番号").fill("１２３４５６７")
    await page.getByLabel("建物名・部屋番号").fill("ドロップハイツ101")
    await page.getByRole("button", { name: "お届け先を保存" }).click()
    await expect(page.getByText("お届け先を保存しました")).toBeVisible()
    await expect(page.getByLabel("郵便番号")).toHaveValue("123-4567")

    await page.getByRole("link", { name: "アカウントへ戻る" }).click()
    const address = page.getByRole("main").locator("address")
    await expect(address).toContainText("〒123-4567")
    await expect(address).toContainText("大阪府 キャンディ市レイン町1-2-3")
    await expect(address).toContainText("ドロップハイツ101")
    await expect(page.getByRole("link", { name: "お届け先を編集" })).toBeVisible()
  })

  test("氏名を保存するとアカウントの表示名が変わる", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await page.goto("/account/edit")
    await expect(page.getByLabel("名", { exact: true })).toHaveValue("Test")
    await page.getByLabel("名", { exact: true }).fill("Candy")
    await page.getByLabel("姓", { exact: true }).fill("Rain")
    await page.getByRole("button", { name: "変更を保存" }).click()
    await expect(page.getByText("アカウント情報を保存しました")).toBeVisible()

    await page.goto("/account")
    await expect(page.getByRole("heading", { name: "Candy Rain", level: 1 })).toBeVisible()
  })
})
