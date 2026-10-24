import Stripe from "stripe"
import type { Page } from "@playwright/test"
import { test, expect } from "./fixtures/store"

// Runs only with Stripe test-mode keys: npm run test:e2e:stripe
test.skip(!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "Stripe test-mode keys are not set")

// https://docs.stripe.com/testing
const CARDS = {
  visa: "4242424242424242",
  declineAfterAttach: "4000000000000341",
  alwaysAuthenticate: "4000002760003184",
}

async function addCard(page: Page, number: string) {
  await page.getByRole("button", { name: "カードを追加" }).click()
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "カードを保存" }) })
  const card = form.locator("iframe").first().contentFrame()
  await card.locator('input[name="number"]').fill(number)
  await card.locator('input[name="expiry"]').fill("12 / 34")
  await card.locator('input[name="cvc"]').fill("123")
  const country = card.locator('select[name="country"]')
  if (await country.count()) await country.selectOption("JP")
  await form.getByRole("button", { name: "カードを保存" }).click()
}

// Stripe's test 3D Secure page shows its own Complete / Fail buttons.
async function completeThreeDSecure(page: Page) {
  const modal = page.locator('iframe[src*="three-ds-2-challenge"]')
  const complete = modal.contentFrame().locator('iframe[name="stripe-challenge-frame"]').contentFrame()
    .getByRole("button", { name: "COMPLETE" })
  // The modal animates in; retry the click until Stripe closes it.
  await expect(async () => {
    await complete.click({ timeout: 5_000 })
    await expect(modal).toHaveCount(0, { timeout: 5_000 })
  }).toPass({ timeout: 45_000 })
}

async function addItemAndOpenCart(page: Page) {
  await page.goto("/products/0")
  await page.getByRole("button", { name: "カートに追加" }).click()
  await expect(page.getByRole("link", { name: "カート(1)" })).toBeVisible()
  await page.goto("/cart")
}

test.afterEach(async ({ shopper, database }) => {
  // Remove the Stripe customer the shopper created so the test account stays clean.
  const result = await database.query<{ stripeCustomerId: string | null }>(
    'SELECT "stripeCustomerId" FROM "User" WHERE id = $1', [shopper.id],
  )
  const customerId = result.rows[0]?.stripeCustomerId
  if (customerId) await new Stripe(process.env.STRIPE_SECRET_KEY!).customers.del(customerId)
})

test.describe("カード決済 (#14)", () => {
  test("お支払い方法にカードを登録・削除できる", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await page.goto("/account/payment")
    await expect(page.getByText("登録済みのカードはありません。")).toBeVisible()

    await addCard(page, CARDS.visa)
    await expect(page.getByRole("status").filter({ hasText: "カードを追加しました" })).toBeVisible()
    await expect(page.getByText("Visa •••• 4242")).toBeVisible()
    await expect(page.getByText("有効期限 12/34")).toBeVisible()

    await page.getByRole("button", { name: "Visa •••• 4242 を削除" }).click()
    await expect(page.getByText("登録済みのカードはありません。")).toBeVisible()
  })

  test("カートで登録したカードを選んで決済し、注文に支払い済みとカードを表示する", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await addItemAndOpenCart(page)
    await expect(page.getByText("注文にはカードの登録が必要です。")).toBeVisible()
    await expect(page.getByRole("button", { name: "注文を確定する" })).toBeDisabled()

    await addCard(page, CARDS.visa)
    await expect(page.getByRole("radio", { name: /Visa •••• 4242/ })).toBeChecked()
    await page.getByRole("button", { name: "注文を確定する" }).click()

    await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/, { timeout: 30_000 })
    await expect(page.getByText("支払い済み", { exact: true })).toBeVisible()
    await expect(page.getByText("Visa •••• 4242")).toBeVisible()
  })

  test("決済が拒否されたカードでは注文せず、カートを残す", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await addItemAndOpenCart(page)
    await addCard(page, CARDS.declineAfterAttach)
    await expect(page.getByRole("radio", { name: /•••• 0341/ })).toBeChecked()
    await page.getByRole("button", { name: "注文を確定する" }).click()

    await expect(page.getByRole("main").getByRole("alert")).toHaveText("カードが承認されませんでした。別のカードをお試しください")
    await page.goto("/orders")
    await expect(page.getByText("注文はまだありません")).toBeVisible()
    await expect(page.getByRole("link", { name: "カート(1)" })).toBeVisible()
  })

  test("3Dセキュアの認証を完了すると注文が確定する", async ({ page, shopper }) => {
    await shopper.signIn(page)
    await addItemAndOpenCart(page)
    await addCard(page, CARDS.alwaysAuthenticate)
    await completeThreeDSecure(page)
    await expect(page.getByRole("radio", { name: /•••• 3184/ })).toBeChecked()

    await page.getByRole("button", { name: "注文を確定する" }).click()
    await completeThreeDSecure(page)
    await expect(page).toHaveURL(/\/orders\/\d+\?placed=1$/, { timeout: 30_000 })
    await expect(page.getByText("支払い済み", { exact: true })).toBeVisible()
  })
})
