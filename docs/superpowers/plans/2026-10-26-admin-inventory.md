# 管理画面 ②：在庫・価格の編集 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者が `/admin/inventory` で各バリエーションの在庫（増減）と価格を変更できるようにする。

**Architecture:** 入力検証は `lib/validation.ts`、DB 更新は `VariantRepository` の条件付き `updateMany`（在庫は `stock >= -delta` 条件で増減、価格は表示時の価格を条件に更新）、業務判定は `services/admin/inventoryAdminService.ts`、画面は ① の管理画面レイアウトの下に置く。

**Tech Stack:** Next.js 16（App Router・Server Actions）、React 19、Prisma 7 / PostgreSQL、Node.js Test Runner + tsx、Playwright

**Spec:** `docs/superpowers/specs/2026-10-26-admin-inventory-design.md`

## Global Constraints

- Next.js はこのリポジトリの版に破壊的変更がある。Next.js の API を使う前に `node_modules/next/dist/docs/` の該当ガイドを読む（AGENTS.md）。
- 層は `app/` → `services/` → `repositories/` → Prisma。管理用のページと Server Action はすべて先頭で `requireAdmin()` を呼ぶ。
- 在庫の増減は −9,999〜+9,999 の 0 以外の整数（`MAX_STOCK_DELTA = 9999`）。価格は 1〜9,999,999 の整数（`MAX_PRICE = 9_999_999`）。
- エラーメッセージ：`VARIANT_NOT_FOUND`「バリエーションが見つかりません」、`INSUFFICIENT_STOCK`「在庫が足りないため減らせません（現在の在庫: {N}）」、`STALE_PRICE`「価格が別の操作で更新されています。最新の状態を確認してください」。検証エラー「入力内容を確認してください」、想定外「処理に失敗しました。時間をおいてもう一度お試しください」。
- 成功メッセージ：「在庫を {N} に更新しました」「価格を {formatPrice(nextPrice)} に更新しました」（`formatPrice` は `lib/format.ts`、例 `¥900`）。
- Server Action の戻り値は `ActionResult<{ message: string }>`。成功時も `InventoryAdminError` 時も `revalidatePath("/admin/inventory")` と `revalidatePath("/", "layout")`。
- 既存の管理用コード（`app/actions/admin/updateShippingStatusAction.ts`、`app/admin/orders/[orderId]/ShippingStatusForm.tsx`、`services/admin/orderAdminService.ts`）の書き方に合わせる。フォームに再マウントを起こす `key` を付けない（再検証で結果メッセージが消えるため）。
- 統合テストは並列実行される。既存のバリエーション 0〜9 とシードユーザーは統合テストで使わない。
- 画面の文言・コミットメッセージは日本語。コミット末尾にはハーネスが指定する Co-Authored-By 行を付ける。

## Review Focus

1. **在庫の増減と購入が同時に走る**：どちらの変更も失われず、0 未満にならない → Task 2 の同時実行テスト。
2. **先頭 `+` や前後の空白付きの入力**（`"+10"`、`" -3 "`）：受け付ける → Task 1 の単体テスト。
3. **同じ価格のまま送信**：エラーにせず何も変えない → Task 2 のテスト（画面ではボタン無効）。
4. **狭い画面幅（390px）**：ナビが増えても管理ヘッダーが横にはみ出さない → Task 3 の E2E。
5. **他の管理者が先に価格を変更**：上書きせず `STALE_PRICE` → Task 2 のテスト。

---

## File Structure

| ファイル | 役割 |
| --- | --- |
| `lib/validation.ts`、`lib/validation.test.mts` | `requireStockDelta`・`requirePrice` と定数 |
| `repositories/interfaces/IVariantRepository.ts`、`repositories/implementations/variantRepository.ts` | `adjustStock`・`updatePrice`・`findStockAndPrice` |
| `services/admin/inventoryAdminService.ts` | `InventoryAdminError`・`adjustStock`・`updatePrice` |
| `tests/integration/adminInventory.test.mts`、`package.json` | 統合テスト |
| `app/actions/admin/adjustStockAction.ts`、`app/actions/admin/updatePriceAction.ts` | Server Actions |
| `app/admin/inventory/page.tsx`、`app/admin/inventory/StockAdjustForm.tsx`、`app/admin/inventory/PriceForm.tsx` | 画面 |
| `app/admin/components/AdminHeader.tsx` | ナビ追加と狭い幅への対応 |
| `e2e/admin.spec.ts` | E2E |
| `README.md`、仕様書 | ドキュメント |

---

### Task 1: 在庫の増減と価格の入力検証

**Files:**
- Modify: `lib/validation.ts`、`lib/validation.test.mts`

**Interfaces:**
- Produces: `MAX_STOCK_DELTA = 9999`、`MAX_PRICE = 9_999_999`、`requireStockDelta(value: unknown): number`、`requirePrice(value: unknown): number`（範囲外・非整数・空・非文字列は `Error`）

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("在庫の増減は 0 以外の -9999〜+9999 の整数を受け付ける", () => {
  assert.equal(requireStockDelta("10"), 10)
  assert.equal(requireStockDelta("+10"), 10)
  assert.equal(requireStockDelta(" -3 "), -3)
  assert.equal(requireStockDelta("9999"), 9999)
  assert.equal(requireStockDelta("-9999"), -9999)
  for (const value of ["0", "10000", "-10000", "1.5", "", null, "abc", "+", "1e3"]) {
    assert.throws(() => requireStockDelta(value), /delta/, String(value))
  }
})

test("価格は 1〜9,999,999 の整数を受け付ける", () => {
  assert.equal(requirePrice("1"), 1)
  assert.equal(requirePrice("9999999"), 9_999_999)
  for (const value of ["0", "-1", "10000000", "1.5", "", null, "abc"]) {
    assert.throws(() => requirePrice(value), /price/, String(value))
  }
})
```

- [ ] **Step 2: 失敗を確認する** — Run: `npx tsx --test lib/validation.test.mts` → FAIL（未定義）
- [ ] **Step 3: 実装する**（文字列は前後の空白を除き、`/^[+-]?\d+$/` に一致するものだけ数値にする。エラーメッセージにそれぞれ `delta` / `price` を含める）
- [ ] **Step 4: 通ることを確認する** — Run: `npm test` → PASS
- [ ] **Step 5: コミットする** — `feat: 在庫の増減と価格の入力検証を追加`

---

### Task 2: 在庫・価格を更新するリポジトリとサービス

**Files:**
- Modify: `repositories/interfaces/IVariantRepository.ts`、`repositories/implementations/variantRepository.ts`
- Create: `services/admin/inventoryAdminService.ts`、`tests/integration/adminInventory.test.mts`
- Modify: `package.json`（`test:integration` に追加）

**Interfaces:**
- Produces:

```ts
// IVariantRepository に追加
adjustStock(variantId: number, delta: number): Promise<number | null>  // 更新後の在庫。条件を満たさなければ null
updatePrice(variantId: number, currentPrice: number, nextPrice: number): Promise<boolean>
findStockAndPrice(variantId: number): Promise<{ stock: number, price: number } | null>
// inventoryAdminService.ts（server-only を付けない）
export type InventoryAdminErrorCode = "VARIANT_NOT_FOUND" | "INSUFFICIENT_STOCK" | "STALE_PRICE"
export class InventoryAdminError extends Error { constructor(public readonly code: InventoryAdminErrorCode, message: string) }
export async function adjustStock(repo: IVariantRepository, variantId: number, delta: number): Promise<{ stock: number }>
export async function updatePrice(repo: IVariantRepository, variantId: number, currentPrice: number, nextPrice: number): Promise<void>
```

  - `adjustStock`（リポジトリ）：`updateMany({ where: { id, stock: { gte: -delta } }, data: { stock: { increment: delta } } })` の後、1 件なら `findUnique` で更新後の在庫を返す。更新と読み直しは同じ `prisma.$transaction` 内で行う（直後の別の更新を読まないため）。
  - サービスの判定は仕様 §2 のとおり（`null` / `false` のとき `findStockAndPrice` で存在を確かめて code を分ける。同じ価格への更新は何もしないで成功）。

- [ ] **Step 1: 失敗する統合テストを書く**（ファイル冒頭で `prisma.product.create` によりテスト用商品 1 件とバリエーション 1 件（`stock: 5`、`price: 800`）を作り、`after` で削除する。`repo = new VariantRepository()`）

```ts
test("在庫を増減でき、更新後の在庫を返す", async () => {
  assert.deepEqual(await adjustStock(repo, variantId, 10), { stock: 15 })
  assert.deepEqual(await adjustStock(repo, variantId, -15), { stock: 0 })
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock, 0)
})

test("0 未満になる減算は現在の在庫を示して拒否し、在庫を変えない", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 2 } })
  await assert.rejects(adjustStock(repo, variantId, -3), { code: "INSUFFICIENT_STOCK", message: "在庫が足りないため減らせません（現在の在庫: 2）" })
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock, 2)
})

test("在庫の減算と購入の減算が同時に走っても、合計どおりに減り 0 未満にならない", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 10 } })
  // A purchase decrements only when enough stock remains, like checkoutService.
  const purchase = () => prisma.variant.updateMany({ where: { id: variantId, stock: { gte: 3 } }, data: { stock: { decrement: 3 } } })
  const results = await Promise.allSettled([adjustStock(repo, variantId, -4), purchase(), adjustStock(repo, variantId, -4), purchase()])
  const stock = (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock
  assert.ok(stock >= 0)
  const adjusted = [results[0], results[2]].filter(result => result.status === "fulfilled").length * 4
  const purchased = [results[1], results[3]].filter(result => result.status === "fulfilled" && result.value.count === 1).length * 3
  assert.equal(stock, 10 - adjusted - purchased)
})

test("価格は表示時の価格を条件に更新し、食い違えば STALE_PRICE で変えない", async () => {
  await prisma.variant.update({ where: { id: variantId }, data: { price: 800 } })
  await updatePrice(repo, variantId, 800, 900)
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).price, 900)
  await assert.rejects(updatePrice(repo, variantId, 800, 1000), { code: "STALE_PRICE" })
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).price, 900)
  await updatePrice(repo, variantId, 900, 900)
  assert.equal((await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).price, 900)
})

test("存在しないバリエーションは VARIANT_NOT_FOUND", async () => {
  await assert.rejects(adjustStock(repo, 999_999, 1), { code: "VARIANT_NOT_FOUND" })
  await assert.rejects(updatePrice(repo, 999_999, 800, 900), { code: "VARIANT_NOT_FOUND" })
})
```

- [ ] **Step 2: 失敗を確認する** — Run: `npx tsx --test tests/integration/adminInventory.test.mts` → FAIL
- [ ] **Step 3: リポジトリとサービスを実装する**
- [ ] **Step 4: 通ることを確認する** — Run: `npm run test:integration && npm run typecheck` → PASS
- [ ] **Step 5: コミットする** — `feat: 在庫の増減と価格の更新処理を追加`

---

### Task 3: 在庫・価格の画面とナビゲーション

**Files:**
- Create: `app/actions/admin/adjustStockAction.ts`、`app/actions/admin/updatePriceAction.ts`、`app/admin/inventory/page.tsx`、`app/admin/inventory/StockAdjustForm.tsx`、`app/admin/inventory/PriceForm.tsx`
- Modify: `app/admin/components/AdminHeader.tsx`、`e2e/admin.spec.ts`

**Interfaces:**
- Consumes: Task 1 の検証関数、Task 2 の `adjustStock`・`updatePrice`・`InventoryAdminError`、既存の `getProductsWithVariants(new ProductRepository())`（`services/storeQueryService.ts`）、`salesTypeMeta`、`formatPrice`
- Produces: `adjustStockAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>>`（入力 `variantId`・`delta`）、`updatePriceAction(...)`（入力 `variantId`・`currentPrice`・`nextPrice`）

- [ ] **Step 1: 失敗する E2E を書く**（`e2e/admin.spec.ts` に追加。対象はバリエーション 1「クリアファイル A」（商品 1、価格 800）。各テストは開始時に DB の在庫・価格を記録し、`finally` で `database.query` により元へ戻す）

```ts
test("顧客は在庫・価格の画面を開けない", async ({ page, shopper }) => {
  await shopper.signIn(page)
  await page.goto("/admin/inventory")
  await expect(page).toHaveURL(/\/products$/)
})

test("管理者が在庫を増やすと売り切れが解除される。0 未満の減算は拒否される", async ({ page, admin, database }) => {
  // 開始時に variant 1 の stock を 0 にする（finally で元に戻す）
  await admin.signIn(page)
  await page.getByRole("link", { name: "在庫・価格" }).click()
  await expect(page).toHaveURL(/\/admin\/inventory$/)
  await page.getByLabel("クリアファイル Aの在庫の増減").fill("-1")
  await page.getByRole("button", { name: "在庫を更新" }).first().click() // 行内のボタンを取る実装でもよい
  await expect(page.getByText("在庫が足りないため減らせません（現在の在庫: 0）")).toBeVisible()
  await page.getByLabel("クリアファイル Aの在庫の増減").fill("+5")
  // 同じ行の「在庫を更新」を押す
  await expect(page.getByText("在庫を 5 に更新しました")).toBeVisible()
  // ストアで確認するため別の顧客コンテキストで /products/1 を開き、クリアファイル A に売り切れバッジがないこと
})

test("管理者が価格を変えると商品ページとカートに反映される", async ({ page, shopper, admin, browser, database }) => {
  // 管理者コンテキストで クリアファイル A の価格を 900 に更新 →「価格を ¥900 に更新しました」
  // 顧客で /products/1 → クリアファイル A を選んで ¥900 表示 → カートに追加 → カートに ¥900
})

test("390px 幅で管理ヘッダーが横にはみ出さない", async ({ page, admin }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await admin.signIn(page)
  for (const path of ["/admin/orders", "/admin/inventory"]) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole("button", { name: "サインアウト" })).toBeInViewport()
  }
})
```

コメントで示した手順は、既存の `e2e/admin.spec.ts`（別コンテキストの開き方・`finally` での後始末）と `e2e/store.spec.ts`（商品ページでの選択とカート追加）の書き方に合わせて具体的に書く。行内のボタンは、行（`getByRole("row", { name: /クリアファイル A/ })`）から取る。

- [ ] **Step 2: 失敗を確認する** — Run: `npm run test:e2e -- e2e/admin.spec.ts` → FAIL（画面がない）
- [ ] **Step 3: Server Actions と画面を実装する**
  - Action は Global Constraints の順序・文言・再検証。`variantId` は `requireNonNegativeInteger`。
  - ページは仕様 §1 のとおり。ページでも `requireAdmin()` を呼ぶ。メタデータの title は「在庫・価格」。
  - `PriceForm` の価格入力は初期値が現在の価格で、入力値が現在の価格と同じ間は「価格を更新」を無効にする。hidden の `currentPrice` は props から描画する（再検証で新しい値に置き換わる）。
  - `StockAdjustForm` は成功後に入力欄を空に戻す。
  - `AdminHeader`：ナビに `{ href: "/admin/inventory", label: "在庫・価格" }` を追加し、390px 幅で収まるようにする（例：`sm` 未満ではロゴを小さくする、ナビとボタンの余白を詰める、サインアウトのラベルを `sm` 未満でアイコンのみにして `aria-label`「サインアウト」を保つ）。ストア側の `StoreHeader` と `SignOut` の既存の見た目は変えない（`SignOut` を変える場合はストア側のスナップショットが変わらないこと）。
- [ ] **Step 4: すべての E2E が通ることを確認する** — Run: `npm run lint && npm run typecheck && npm run test:e2e` → PASS（既存のスナップショットに差分なし）
- [ ] **Step 5: コミットする** — `feat: 管理画面で在庫と価格を変更できるようにする`

---

### Task 4: ドキュメントの更新と最終確認

**Files:**
- Modify: `README.md`（機能表の「管理画面」行に在庫の増減・価格の変更を追記）、`e2e/README.md`（`admin.spec.ts` の説明に在庫・価格を追記）、`docs/superpowers/specs/2026-10-26-admin-inventory-design.md`（状態を「実装済み」に。実装で仕様から変えた点があれば「実装時の変更点」に記録）

- [ ] **Step 1: ドキュメントを更新する**
- [ ] **Step 2: 全チェックを実行する** — Run: `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:e2e && npm run build` → すべて PASS
- [ ] **Step 3: コミットする** — `docs: 在庫・価格の編集を README に追記`
