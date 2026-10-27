# 管理画面 ①：管理者ロール・アクセス制御・注文管理 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者ロールを追加し、管理者だけが全注文の閲覧・発送ステータス変更・キャンセル（在庫戻しと Stripe 返金）を行える `/admin` 画面を作る。

**Architecture:** `User.role` を DB に持ち、`proxy.ts` はセッションのロールで画面を振り分け、権限の最終判断は `requireAdmin()` が DB で行う。ストア用の枠（ヘッダー・カート件数）は `StoreShell` に切り出して `app/(routes)/layout.tsx` に移し、`app/admin/layout.tsx` は管理用の枠を持つ。注文の書き込みは `services/admin/orderAdminService.ts` が Prisma のトランザクションを直接管理し、返金は DB 確定後に `PaymentGateway.refund` で行う。

**Tech Stack:** Next.js 16（App Router・Server Actions・`proxy.ts`）、React 19、Prisma 7 / PostgreSQL、Auth.js 5 beta、Stripe（テストモード）、Node.js Test Runner + tsx、Playwright

**Spec:** `docs/superpowers/specs/2026-10-25-admin-orders-design.md`

## Global Constraints

- Next.js はこのリポジトリの版に破壊的変更がある。Next.js の API を使うコードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む（AGENTS.md）。
- 層は `app/` → `services/` → `repositories/` → Prisma。複数テーブルを一括更新する処理だけ Service が `prisma.$transaction` を直接使う（`checkoutService` と同じ）。
- 管理者デモアカウント：`admin@mail.com` / `demo-password`、ユーザー ID `2`、カートなし。
- 発送ステータス：`未発送`・`発送準備中`・`発送済み`・`キャンセル`。支払い状態の追加：`返金済み`・`返金エラー`。DB は文字列カラムのまま。
- 返金の冪等キー：`order-{orderId}-refund`。
- すべての管理用ページ・Server Action の先頭で `requireAdmin()` を呼ぶ。
- 画面の文言・コミットメッセージは日本語。既存コードのスタイル（セミコロンなし、ダブルクォート）に合わせる。
- コミットメッセージの末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける。
- 仕様からの小さな具体化：発送状態の絞り込みは `?shippingStatus=<slug>`（`unshipped` / `preparing` / `shipped` / `cancelled`）。管理用 Server Action の戻り値は `FormActionState` ではなく既存の `ActionResult<{ message: string }>`（項目別エラーがないため）。

## Review Focus

1. **権限を外された管理者の古いセッション**：JWT に `ADMIN` が残っていても DB が `CUSTOMER` なら操作できないこと → Task 1 の `isAdmin` テスト（DB 側のロールで判定）。
2. **お届け先未登録の顧客の注文**：管理側の注文詳細が落ちずに「未登録」と表示されること → Task 5 の `findByIdForAdmin` テスト（`shippingAddress: null`）。
3. **不正な注文 ID の URL**（`/admin/orders/abc`、`/admin/orders/-1`、存在しない ID）：500 ではなく 404 になること → Task 5 の E2E。
4. **未知の絞り込み値**（`?shippingStatus=foo`）：エラーにせず全件表示すること → Task 4 の `parseShippingStatusSlug` テスト。
5. **複数明細の注文のキャンセル**：すべての明細の在庫がそれぞれの数量だけ戻ること → Task 7 の統合テスト（2 明細の注文）。

---

## File Structure

| ファイル | 役割 |
| --- | --- |
| `prisma/schema.prisma`、`prisma/migrations/20261026090000_add_user_role/migration.sql` | `Role` enum と `User.role` |
| `prisma/seed.ts` | 管理者デモアカウント |
| `lib/roles.ts` | `Role` 型（Prisma に依存しない。proxy・型拡張から使う） |
| `auth.ts`、`types/next-auth.d.ts`（既存の型拡張ファイル） | セッション・JWT に `role` を載せる |
| `lib/auth.ts` | `requireAdmin()` |
| `services/accountService.ts`、`repositories/*/…UserRepository.ts` | `isAdmin`、`findRoleByUserId` |
| `app/components/StoreShell.tsx` | ストアのヘッダー・メイン・フッターとカート件数の取得 |
| `app/layout.tsx`、`app/(routes)/layout.tsx`、`app/(routes)/page.tsx`、`app/not-found.tsx`、`app/(routes)/not-found.tsx`、`app/components/NotFoundContent.tsx` | レイアウトの整理 |
| `proxy.ts` | ロールによる振り分け |
| `app/admin/layout.tsx`、`app/admin/page.tsx`、`app/admin/not-found.tsx`、`app/admin/components/AdminHeader.tsx` | 管理画面の枠 |
| `services/checkout/orderStatus.ts` | ステータス定数 |
| `services/admin/shippingStatusTransition.ts` | 発送ステータスの一覧・slug・遷移ルール（純粋関数） |
| `lib/validation.ts` | 管理用入力の検証 |
| `repositories/interfaces/IOrderRepository.ts`、`repositories/implementations/orderRepository.ts` | 管理者用の読み取り |
| `services/admin/adminQueryService.ts` | 管理者用の読み取り関数 |
| `services/admin/orderAdminService.ts` | 発送ステータス変更・キャンセル・返金再試行 |
| `services/payment/paymentGateway.ts`、`services/payment/stripePaymentGateway.ts` | `refund` |
| `app/actions/admin/*.ts` | 管理用 Server Actions |
| `app/admin/orders/**` | 一覧・詳細・フォーム |
| `tests/integration/adminOrders.test.mts`、`tests/integration/fakeGateway.mts` | 統合テストと共有の FakeGateway |
| `e2e/admin.spec.ts`、`e2e/fixtures/store.ts`、`e2e/payment.spec.ts`、`prisma/reset-e2e.ts` | E2E |

---

### Task 1: 管理者ロールとサーバー側の権限確認

**Files:**
- Modify: `prisma/schema.prisma`（`User` に `role Role @default(CUSTOMER)`、`enum Role { CUSTOMER ADMIN }`）
- Create: `prisma/migrations/20261026090000_add_user_role/migration.sql`（`npx prisma migrate dev --name add_user_role --create-only` で生成し、フォルダ名を合わせる）
- Modify: `prisma/seed.ts`
- Create: `lib/roles.ts`
- Modify: `auth.ts`、`types/` 配下の Auth.js 型拡張
- Modify: `repositories/interfaces/IUserRepository.ts`、`repositories/implementations/userRepository.ts`、`services/accountService.ts`、`lib/auth.ts`
- Test: `tests/integration/account.test.mts`

**Interfaces:**
- Produces:
  - `lib/roles.ts`：`export const roles = ["CUSTOMER", "ADMIN"] as const`、`export type Role = (typeof roles)[number]`
  - `session.user.role: Role`、`token.role?: Role`
  - `IUserRepository.findRoleByUserId(userId: number): Promise<Role | null>`
  - `isAdmin(repo: IUserRepository, userId: number): Promise<boolean>`（`services/accountService.ts`）
  - `requireAdmin(): Promise<number>`（`lib/auth.ts`。未サインインは `/signin`、非管理者は `/products` へ `redirect`。戻り値は管理者のユーザー ID）

- [ ] **Step 1: 失敗するテストを書く**（`tests/integration/account.test.mts` に追加。`after` で user 1 の role を `CUSTOMER` に戻す）

```ts
test("isAdmin は DB のロールで判定する", async () => {
  const repo = new UserRepository()
  assert.equal(await isAdmin(repo, 2), true)
  assert.equal(await isAdmin(repo, 0), false)
  assert.equal(await isAdmin(repo, 999_999), false)

  // A session minted while the user was an admin must stop working once the role is removed.
  await prisma.user.update({ where: { id: 1 }, data: { role: "ADMIN" } })
  assert.equal(await isAdmin(repo, 1), true)
  await prisma.user.update({ where: { id: 1 }, data: { role: "CUSTOMER" } })
  assert.equal(await isAdmin(repo, 1), false)
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx --test tests/integration/account.test.mts`
Expected: FAIL（`isAdmin` が未定義、または `role` 列がない）

- [ ] **Step 3: スキーマ・マイグレーション・シードを実装する**
  - マイグレーションを作って `npm run db:migrate` で適用する。
  - シード：既存ユーザーと同じく `createMany({ data: [{ id: 2, email: "admin@mail.com", passwordHash, firstName: "Admin", lastName: "Candy", role: "ADMIN" }], skipDuplicates: true })` の後、`update` で `email`・`passwordHash`・`role` を上書きする。カートは作らない。既存の `setval` はそのまま（最後に実行されるので ID 2 も反映される）。
  - `npm run db:seed` を実行する。

- [ ] **Step 4: `findRoleByUserId`・`isAdmin`・`requireAdmin` とセッションの `role` を実装する**
  - `authorize` は `{ id, email, role }` を返し、`jwt` で `token.role = user.role`、`session` で `session.user.role = token.role` を設定する。
  - `requireAdmin` は既存の `requireUserId` と同じ方法でユーザー ID を得てから `isAdmin(new UserRepository(), userId)` を呼ぶ。

- [ ] **Step 5: テストが通ることを確認する**

Run: `npx tsx --test tests/integration/account.test.mts && npm run typecheck`
Expected: PASS

- [ ] **Step 6: コミットする**

```bash
git add prisma lib/roles.ts auth.ts types lib/auth.ts repositories services/accountService.ts tests/integration/account.test.mts
git commit -m "feat: 管理者ロールとサーバー側の権限確認を追加"
```

---

### Task 2: ストアの枠をレイアウトから切り出す

管理画面にストアのヘッダーを出さないための準備。**ストア側の見た目は変えない**ことが受け入れ条件。

**Files:**
- Create: `app/components/StoreShell.tsx`、`app/(routes)/layout.tsx`、`app/components/NotFoundContent.tsx`、`app/(routes)/not-found.tsx`
- Modify: `app/layout.tsx`、`app/not-found.tsx`
- Move: `app/page.tsx` → `app/(routes)/page.tsx`（`git mv`）
- Test: `e2e/pages.spec.ts`

**Interfaces:**
- Produces: `StoreShell({ children }: { children: React.ReactNode })`（async Server Component。`auth()` とカート件数の取得、`StoreHeader`・`<main className="page-shell flex-1 py-8 sm:py-12">`・`StoreFooter` を描画する）

- [ ] **Step 1: 現在のスナップショットが通ることを確認する（基準）**

Run: `npm run test:e2e -- e2e/snapshots.spec.ts e2e/pages.spec.ts`
Expected: PASS

- [ ] **Step 2: 切り出しを実装する**
  - `app/layout.tsx` は `<html>`・`<body className="flex flex-col">`・フォント・メタデータだけにする。
  - `StoreShell` は現在の `RootLayout` のカート件数取得とヘッダー・メイン・フッターを移したもの。カートが見つからない場合は例外ではなく件数 0 にする（管理者が未定義 URL を開いて `app/not-found.tsx` が出る場合に備える）。
  - `app/(routes)/layout.tsx` は `<StoreShell>{children}</StoreShell>`。
  - 現在の `app/not-found.tsx` の中身を `NotFoundContent` に移す。`app/(routes)/not-found.tsx` は `<NotFoundContent />`（`(routes)` 内で `notFound()` したときに使われ、ストアの枠はレイアウトが出す）。`app/not-found.tsx` は `<StoreShell><NotFoundContent /></StoreShell>`（未定義 URL 用）。両方に既存と同じ `metadata` を付ける。
  - 実装前に `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md` と `route-groups.md` を読む。

- [ ] **Step 3: スナップショットと既存 E2E が変わらないことを確認する**

`e2e/pages.spec.ts` に次のテストを追加する（存在しない商品は既存の `products.spec.ts` が見出しを確認済み。ここではヘッダーが残ることを確かめる）：

```ts
test("404 はストアのヘッダー付きで表示される", async ({ page, shopper }) => {
  await shopper.signIn(page)
  for (const path of ["/no-such-page", "/products/999999"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { name: "ページが見つかりません", exact: true })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "メインナビゲーション" })).toBeVisible()
  }
})
```

Run: `npm run lint && npm run typecheck && npm run test:e2e`
Expected: PASS（スナップショットの更新なし）

- [ ] **Step 4: コミットする**

```bash
git add app
git commit -m "refactor: ストアの枠をルートレイアウトから切り出す"
```

---

### Task 3: ロールによる振り分けと管理画面の枠

**Files:**
- Modify: `proxy.ts`
- Create: `app/admin/layout.tsx`、`app/admin/page.tsx`、`app/admin/not-found.tsx`、`app/admin/components/AdminHeader.tsx`、`app/admin/orders/page.tsx`（この Task では見出し「注文管理」だけの仮ページ。Task 5 で中身を作る）
- Modify: `app/(routes)/signin/page.tsx`
- Create: `e2e/admin.spec.ts`
- Modify: `e2e/fixtures/store.ts`、`e2e/__snapshots__/…/signin*.yml`（意図した更新）

**Interfaces:**
- Consumes: `session.user.role`、`requireAdmin()`（Task 1）
- Produces:
  - E2E フィクスチャ `admin: { signIn: (page: Page) => Promise<void> }`（`admin@mail.com` でサインインし、`/admin/orders` に移動したことを確認する）
  - `AdminHeader`：ロゴ、ナビ「注文」（`/admin/orders`）、既存の `SignOut` ボタン

- [ ] **Step 1: 失敗する E2E を書く**（`e2e/admin.spec.ts`）

```ts
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
```

- [ ] **Step 2: 失敗を確認する**

Run: `npm run test:e2e -- e2e/admin.spec.ts`
Expected: FAIL（`/admin/orders` が 404、管理者が `/products` に留まる）

- [ ] **Step 3: proxy と管理画面の枠を実装する**
  - `proxy.ts`：既存の未サインイン判定の後に、`req.auth.user.role` で振り分ける。
    - 非管理者が `/admin` または `/admin/` 配下 → `/products`
    - 管理者が `/admin` 配下・`/signout` 以外 → `/admin`
  - `SignInForm` の `redirect("/products")` は変えない（管理者は proxy が `/admin` へ送る）。
  - `app/admin/layout.tsx`：`await requireAdmin()` の後、`AdminHeader` と `<main className="page-shell flex-1 py-8 sm:py-12">` を描画する。メタデータの title テンプレートは `"%s | 管理画面 | Candy Rain Official Store"`。
  - `app/admin/page.tsx`：`redirect("/admin/orders")`。
  - `app/admin/not-found.tsx`：「注文が見つかりません」と「注文一覧へ」リンク（`EmptyState` を再利用）。
  - サインイン画面の入力例に、既存の段落と同じ形で「管理者: admin@mail.com / demo-password」を追加する。

- [ ] **Step 4: E2E が通ることを確認し、サインイン画面のスナップショットを意図して更新する**

Run: `npm run test:e2e -- e2e/admin.spec.ts` → PASS
Run: `npx playwright test e2e/snapshots.spec.ts --update-snapshots` の後 `git diff e2e/__snapshots__` で差分がサインイン画面の管理者アカウントの行だけであることを確認する
Run: `npm run test:e2e` → PASS

- [ ] **Step 5: コミットする**

```bash
git add proxy.ts app e2e
git commit -m "feat: ロールで画面を振り分け、管理画面の枠を追加"
```

---

### Task 4: 発送ステータスの定義・遷移ルール・入力検証

**Files:**
- Modify: `services/checkout/orderStatus.ts`
- Create: `services/admin/shippingStatusTransition.ts`、`services/admin/shippingStatusTransition.test.mts`
- Modify: `lib/validation.ts`、`lib/validation.test.mts`、`package.json`（`test` に `services/admin/shippingStatusTransition.test.mts` を追加）

**Interfaces:**
- Produces:
  - `orderStatus.ts`：`PREPARING_SHIPPING_STATUS = "発送準備中"`、`SHIPPED_SHIPPING_STATUS = "発送済み"`、`CANCELLED_SHIPPING_STATUS = "キャンセル"`、`REFUNDED_PAYMENT_STATUS = "返金済み"`、`REFUND_ERROR_PAYMENT_STATUS = "返金エラー"`
  - `shippingStatusTransition.ts`（`server-only` を付けない純粋モジュール）：
    - `shippingStatuses`（`[未発送, 発送準備中, 発送済み, キャンセル]` の `as const` 配列、定数から組み立てる）、`type ShippingStatus`
    - `shippingStatusSlugs: Record<ShippingStatus, string>`（`unshipped` / `preparing` / `shipped` / `cancelled`）
    - `parseShippingStatusSlug(slug: string | string[] | undefined): ShippingStatus | null`
    - `changeableShippingStatuses`（キャンセル以外の 3 つ。変更フォームの選択肢に使う）
    - `canChangeShippingStatus(from: string, to: string): boolean`
    - `canCancelOrder(shippingStatus: string): boolean`
    - `canRetryRefund(shippingStatus: string, paymentStatus: string): boolean`
  - `lib/validation.ts`：
    - `requireShippingStatus(value: unknown, fieldName: string): ShippingStatus`（4 つ以外は `Error`）
    - `requireConfirmation(value: unknown): void`（`"on"` 以外は `Error("confirmation is required")`）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// services/admin/shippingStatusTransition.test.mts
const active = ["未発送", "発送準備中", "発送済み"]
test("未発送・発送準備中・発送済みの間は前後どちらにも変更できる", () => {
  for (const from of active) for (const to of active) {
    assert.equal(canChangeShippingStatus(from, to), from !== to, `${from} -> ${to}`)
  }
})
test("キャンセルへの変更・キャンセルからの変更・未知の値は拒否する", () => {
  for (const status of active) {
    assert.equal(canChangeShippingStatus(status, "キャンセル"), false)
    assert.equal(canChangeShippingStatus("キャンセル", status), false)
  }
  assert.equal(canChangeShippingStatus("未発送", "配達中"), false)
  assert.equal(canChangeShippingStatus("配達中", "未発送"), false)
})
test("キャンセルできるのは未発送・発送準備中だけ", () => {
  assert.deepEqual(["未発送", "発送準備中", "発送済み", "キャンセル"].map(canCancelOrder), [true, true, false, false])
})
test("返金の再試行はキャンセル済みかつ返金エラーのときだけ", () => {
  assert.equal(canRetryRefund("キャンセル", "返金エラー"), true)
  assert.equal(canRetryRefund("キャンセル", "返金済み"), false)
  assert.equal(canRetryRefund("未発送", "返金エラー"), false)
})
test("絞り込みの slug を解決し、未知の値は絞り込みなしにする", () => {
  assert.equal(parseShippingStatusSlug("preparing"), "発送準備中")
  assert.equal(parseShippingStatusSlug("cancelled"), "キャンセル")
  assert.equal(parseShippingStatusSlug("foo"), null)
  assert.equal(parseShippingStatusSlug(["preparing", "shipped"]), null)
  assert.equal(parseShippingStatusSlug(undefined), null)
})
```

```ts
// lib/validation.test.mts に追加
test("発送ステータスは定義済みの値だけ受け付ける", () => {
  assert.equal(requireShippingStatus("発送済み", "nextStatus"), "発送済み")
  assert.throws(() => requireShippingStatus("配達中", "nextStatus"), /nextStatus/)
  assert.throws(() => requireShippingStatus(null, "nextStatus"), /nextStatus/)
})
test("キャンセルの確認チェックは on だけ受け付ける", () => {
  assert.doesNotThrow(() => requireConfirmation("on"))
  for (const value of [null, "", "off", "true"]) assert.throws(() => requireConfirmation(value), /confirmation/)
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx --test services/admin/shippingStatusTransition.test.mts lib/validation.test.mts`
Expected: FAIL（モジュール・関数が未定義）

- [ ] **Step 3: 定数・遷移ルール・検証関数を実装する**

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add services/checkout/orderStatus.ts services/admin lib/validation.ts lib/validation.test.mts package.json
git commit -m "feat: 発送ステータスの遷移ルールと管理用の入力検証を追加"
```

---

### Task 5: 注文一覧・注文詳細（読み取り）

**Files:**
- Modify: `repositories/interfaces/IOrderRepository.ts`、`repositories/implementations/orderRepository.ts`
- Create: `services/admin/adminQueryService.ts`
- Modify: `app/admin/orders/page.tsx`
- Create: `app/admin/orders/ShippingStatusFilter.tsx`、`app/admin/orders/[orderId]/page.tsx`
- Create: `tests/integration/adminOrders.test.mts`、`package.json`（`test:integration` に追加）
- Modify: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `ShippingStatus`・`shippingStatuses`・`shippingStatusSlugs`・`parseShippingStatusSlug`（Task 4）、`requireAdmin()`（Task 1）
- Produces（`IOrderRepository.ts` に型を定義）：

```ts
export type AdminOrderSummary = {
  id: number, orderedAt: Date, totalPrice: number,
  paymentStatus: string, shippingStatus: string, customerName: string,
}
export type AdminOrderDetail = AdminOrderSummary & {
  shippingPrice: number, paymentMethodLabel: string | null, hasPayment: boolean,
  customerEmail: string,
  shippingAddress: { postalCode: string, prefecture: string, addressLine1: string, addressLine2: string | null } | null,
}
// IOrderRepository に追加
findManyForAdmin(filter: { shippingStatus: ShippingStatus | null }): Promise<AdminOrderSummary[]>
findByIdForAdmin(orderId: number): Promise<AdminOrderDetail | null>
```

  - `adminQueryService.ts`（`import "server-only"`）：`getOrdersForAdmin(repo: IOrderRepository, shippingStatus: ShippingStatus | null)`、`getOrderForAdmin(repo: IOrderRepository, orderId: number)`
  - `customerName` は `${lastName} ${firstName}`。`hasPayment` は `paymentIntentId !== null`。`shippingAddress` は郵便番号・都道府県・住所 1 がすべてあるときだけ値を持つ。

- [ ] **Step 1: 失敗する統合テストを書く**（`tests/integration/adminOrders.test.mts`。`node --test` はファイルを並列に実行するため、シードのユーザーは使わない。ファイル冒頭で専用ユーザー（`email: admin-orders-${Date.now()}@example.test`、`firstName: "Hana"`、`lastName: "Test"`、住所あり）を作り、`after` で注文・明細・ユーザーを削除する。以下の `userId` はこのユーザーの ID。在庫を変えるテストは variant `8` を使う＝他の統合テストと競合しない）

```ts
test("管理者用の一覧は全ユーザーの注文を新しい順に注文者名つきで返し、発送状態で絞り込める", async () => {
  const older = await createOrder({ userId, shippingStatus: "未発送", orderedAt: new Date("2026-01-01") })
  const newer = await createOrder({ userId, shippingStatus: "発送準備中", orderedAt: new Date("2026-01-02") })
  const all = await getOrdersForAdmin(new OrderRepository(), null)
  const ids = all.map(order => order.id)
  assert.ok(ids.indexOf(newer.id) < ids.indexOf(older.id))
  assert.equal(all.find(order => order.id === newer.id)?.customerName, "Test Hana")

  const preparing = await getOrdersForAdmin(new OrderRepository(), "発送準備中")
  assert.ok(preparing.every(order => order.shippingStatus === "発送準備中"))
  assert.ok(preparing.some(order => order.id === newer.id))
})

test("管理者用の詳細は所有者を問わず返し、お届け先がなければ null にする", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送" })
  const detail = await getOrderForAdmin(new OrderRepository(), order.id)
  assert.equal(detail?.customerEmail, userEmail)
  assert.equal(detail?.hasPayment, false)
  assert.equal(detail?.shippingAddress?.prefecture, "東京都")

  await prisma.user.update({ where: { id: userId }, data: { postalCode: null } })
  assert.equal((await getOrderForAdmin(new OrderRepository(), order.id))?.shippingAddress, null)
  assert.equal(await getOrderForAdmin(new OrderRepository(), 999_999), null)
})
```

（`createOrder(input: { userId, shippingStatus, paymentStatus?, paymentIntentId?, orderedAt?, items? })` はこのファイル内のヘルパー。`items` の既定は `[{ variantId: 8, quantity: 1 }]`、`paymentStatus` の既定は `支払い待ち`。在庫は減らさずに注文と明細だけ作る。`findOrder`・`statusesOf`・`stockOf` も同じファイルのヘルパー。専用ユーザーの住所は `東京都` で作る。）

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx --test tests/integration/adminOrders.test.mts`
Expected: FAIL（メソッドが未定義）

- [ ] **Step 3: リポジトリとクエリ関数を実装し、テストを通す**

Run: `npx tsx --test tests/integration/adminOrders.test.mts`
Expected: PASS

- [ ] **Step 4: 失敗する E2E を書く**（`e2e/admin.spec.ts` に追加）

```ts
test("管理者は顧客の注文を一覧と詳細で確認できる", async ({ page, shopper, admin, browser }) => {
  const orderId = await placeOrderAs(shopper, page) // 商品 0 をカートに入れて購入し、注文 ID を返すヘルパー
  const adminPage = await (await browser.newContext()).newPage()
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
})

test("不正・存在しない注文 ID は 404 になる", async ({ page, admin }) => {
  await admin.signIn(page)
  for (const id of ["abc", "-1", "999999"]) {
    const response = await page.goto(`/admin/orders/${id}`)
    expect(response?.status()).toBe(404)
    await expect(page.getByText("注文が見つかりません")).toBeVisible()
  }
})
```

（`placeOrderAs` は `e2e/admin.spec.ts` 内のヘルパー。既存 `store.spec.ts` の購入手順と同じ操作で、購入後の URL `/orders/{id}` から ID を取る。）

- [ ] **Step 5: 一覧・絞り込み・詳細ページを実装する**
  - 一覧：`PageHeader`（見出し「注文管理」）、`ShippingStatusFilter`（`SalesTypeFilter` と同じ見た目と `aria-current`。「すべて」＋4 状態、`aria-label="発送状態で絞り込み"`）、`Table` の列は「注文番号（`#123` で詳細へのリンク）・注文日時（既存の `formatOrderDateTime`）・注文者・合計（既存の価格フォーマッター）・支払い・発送」。0 件は `EmptyState`。
  - 詳細：`orderId` は `toNonNegativeInteger` で解釈し、`null` または注文なしなら `notFound()`。見出し「注文 #{id}」、支払い・発送のバッジ、明細表（`getOrderItemsByOrderId`）、送料・合計（既存 `PriceSummary` が使えれば再利用）、注文者名・メールアドレス、お届け先（`null` なら「お届け先は登録されていません」）、支払い方法（`paymentMethodLabel ?? "決済なし"`）。フォームを置く場所（Task 6・8）を空けておく。
  - `searchParams`・`params` は Promise（既存ページと同じ書き方）。

- [ ] **Step 6: テストが通ることを確認する**

Run: `npm run typecheck && npm run test:e2e -- e2e/admin.spec.ts`
Expected: PASS

- [ ] **Step 7: コミットする**

```bash
git add repositories services/admin app/admin tests/integration/adminOrders.test.mts package.json e2e/admin.spec.ts
git commit -m "feat: 管理画面に注文一覧と注文詳細を追加"
```

---

### Task 6: 発送ステータスの変更

**Files:**
- Create: `services/admin/orderAdminService.ts`
- Create: `app/actions/admin/updateShippingStatusAction.ts`、`app/admin/orders/[orderId]/ShippingStatusForm.tsx`
- Modify: `app/admin/orders/[orderId]/page.tsx`、`tests/integration/adminOrders.test.mts`、`e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `canChangeShippingStatus`・`changeableShippingStatuses`・`ShippingStatus`（Task 4）、`requireShippingStatus`（Task 4）
- Produces:

```ts
export type OrderAdminErrorCode = "ORDER_NOT_FOUND" | "INVALID_TRANSITION" | "STALE_STATUS" | "NOT_CANCELLABLE" | "REFUND_NOT_RETRYABLE"
export class OrderAdminError extends Error { constructor(public readonly code: OrderAdminErrorCode, message: string) }
export async function updateShippingStatus(orderId: number, currentStatus: ShippingStatus, nextStatus: ShippingStatus): Promise<void>
// app/actions/admin/updateShippingStatusAction.ts
export async function updateShippingStatusAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>>
```

  - エラーメッセージ（`OrderAdminError` の `message` に入れ、そのまま画面に出す）：

| code | message |
| --- | --- |
| `ORDER_NOT_FOUND` | 注文が見つかりません |
| `INVALID_TRANSITION` | この発送ステータスには変更できません |
| `STALE_STATUS` | 注文が別の操作で更新されています。最新の状態を確認してください |
| `NOT_CANCELLABLE` | この注文はキャンセルできません（発送済み・キャンセル済み、または別の操作で更新済みです） |
| `REFUND_NOT_RETRYABLE` | この注文は返金を再試行できません |

- [ ] **Step 1: 失敗する統合テストを書く**

```ts
test("発送ステータスを変更できる", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送" })
  await updateShippingStatus(order.id, "未発送", "発送準備中")
  await updateShippingStatus(order.id, "発送準備中", "発送済み")
  await updateShippingStatus(order.id, "発送済み", "発送準備中")
  assert.equal((await findOrder(order.id)).shippingStatus, "発送準備中")
})

test("許可されない変更・食い違い・存在しない注文はエラーにし、DB を変えない", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送" })
  await assert.rejects(updateShippingStatus(order.id, "未発送", "キャンセル"), { code: "INVALID_TRANSITION" })
  await assert.rejects(updateShippingStatus(order.id, "発送準備中", "発送済み"), { code: "STALE_STATUS" })
  await assert.rejects(updateShippingStatus(999_999, "未発送", "発送済み"), { code: "ORDER_NOT_FOUND" })
  assert.equal((await findOrder(order.id)).shippingStatus, "未発送")
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx --test tests/integration/adminOrders.test.mts`
Expected: FAIL（`updateShippingStatus` が未定義）

- [ ] **Step 3: `updateShippingStatus` を実装し、テストを通す**（仕様 §2「書き込み」のとおり条件付き `updateMany`。0 件なら `findUnique` で存在を確かめて `ORDER_NOT_FOUND` / `STALE_STATUS` を分ける）

Run: `npx tsx --test tests/integration/adminOrders.test.mts`
Expected: PASS

- [ ] **Step 4: 失敗する E2E を書く**

```ts
test("管理者が発送ステータスを変更すると顧客の注文詳細に反映される", async ({ page, shopper, admin, browser }) => {
  const orderId = await placeOrderAs(shopper, page)
  const adminPage = await (await browser.newContext()).newPage()
  await admin.signIn(adminPage)
  await adminPage.goto(`/admin/orders/${orderId}`)
  await adminPage.getByLabel("発送ステータス").selectOption("発送準備中")
  await adminPage.getByRole("button", { name: "発送ステータスを変更" }).click()
  await expect(adminPage.getByText("発送ステータスを「発送準備中」に変更しました")).toBeVisible()
  await page.goto(`/orders/${orderId}`)
  await expect(page.getByRole("main")).toContainText("発送準備中")
})
```

- [ ] **Step 5: Server Action とフォームを実装する**
  - Action：`requireAdmin()` → `requireNonNegativeInteger(formData.get("orderId"), "orderId")`・`requireShippingStatus(formData.get("currentStatus"), "currentStatus")`・`requireShippingStatus(formData.get("nextStatus"), "nextStatus")`（検証エラーは `{ success: false, message: "入力内容を確認してください" }`）→ `updateShippingStatus` → `revalidatePath("/admin/orders", "layout")` と `revalidatePath("/orders", "layout")` → `{ success: true, message: "発送ステータスを「{nextStatus}」に変更しました" }`。`OrderAdminError` は `{ success: false, message: error.message }`、それ以外は `console.error` の後 `{ success: false, message: "処理に失敗しました。時間をおいてもう一度お試しください" }`。
  - フォーム（Client Component、`useActionState`）：hidden の `orderId`・`currentStatus`、`<select name="nextStatus">`（ラベル「発送ステータス」、選択肢は `changeableShippingStatuses`、初期値は現在値）、送信ボタン「発送ステータスを変更」（現在値のままなら無効）、結果メッセージ（成功は既存 `FormMessage` と同じ見た目、失敗は `role="alert"`）。
  - 詳細ページでは発送状態がキャンセルのときフォームを出さない。

- [ ] **Step 6: テストが通ることを確認する**

Run: `npm run typecheck && npm run lint && npm run test:e2e -- e2e/admin.spec.ts`
Expected: PASS

- [ ] **Step 7: コミットする**

```bash
git add services/admin app/actions/admin app/admin tests/integration/adminOrders.test.mts e2e/admin.spec.ts
git commit -m "feat: 管理画面で発送ステータスを変更できるようにする"
```

---

### Task 7: キャンセル・返金のサービス

**Files:**
- Modify: `services/payment/paymentGateway.ts`、`services/payment/stripePaymentGateway.ts`
- Create: `tests/integration/fakeGateway.mts`（`payment.test.mts` の `FakeGateway` を移し、`refund` を追加して両方のテストから使う）
- Modify: `tests/integration/payment.test.mts`、`services/admin/orderAdminService.ts`、`tests/integration/adminOrders.test.mts`

**Interfaces:**
- Consumes: `OrderAdminError`（Task 6）、`canRetryRefund`（Task 4）、ステータス定数（Task 4）
- Produces:

```ts
// PaymentGateway に追加
refund(paymentIntentId: string, idempotencyKey: string): Promise<void>
// orderAdminService.ts
export type RefundOutcome = "none" | "refunded" | "failed"
export async function cancelOrder(getGateway: () => PaymentGateway, orderId: number): Promise<{ refund: RefundOutcome }>
export async function retryRefund(getGateway: () => PaymentGateway, orderId: number): Promise<{ refund: "refunded" | "failed" }>
```

  - `getGateway` は決済ありの注文で返金するときだけ呼ぶ（Stripe 未設定でも決済なしの注文をキャンセルできるようにするため）。
  - `FakeGateway` に `refundFails = false` と `refunds: { paymentIntentId: string, idempotencyKey: string }[]` を追加する。

- [ ] **Step 1: 失敗する統合テストを書く**（variant 8 を使い、テスト前後で在庫を記録・復元する）

```ts
test("決済ありの注文をキャンセルすると、全明細の在庫が戻り、冪等キー付きで 1 回返金される", async () => {
  const order = await createOrder({ userId, shippingStatus: "発送準備中", paymentStatus: "支払い済み", paymentIntentId: "pi_cancel_1",
    items: [{ variantId: 8, quantity: 2 }, { variantId: 8, quantity: 3 }] })
  const before = await stockOf(8)
  const gateway = new FakeGateway()
  assert.deepEqual(await cancelOrder(() => gateway, order.id), { refund: "refunded" })
  assert.equal(await stockOf(8), before + 5)
  assert.deepEqual(await statusesOf(order.id), { shippingStatus: "キャンセル", paymentStatus: "返金済み" })
  assert.deepEqual(gateway.refunds, [{ paymentIntentId: "pi_cancel_1", idempotencyKey: `order-${order.id}-refund` }])
})

test("決済なしの注文はゲートウェイを呼ばず、支払い状態を変えない", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送", paymentStatus: "支払い待ち", items: [{ variantId: 8, quantity: 1 }] })
  const result = await cancelOrder(() => { throw new Error("gateway must not be created") }, order.id)
  assert.deepEqual(result, { refund: "none" })
  assert.deepEqual(await statusesOf(order.id), { shippingStatus: "キャンセル", paymentStatus: "支払い待ち" })
})

test("返金に失敗してもキャンセルは確定し、返金エラーから再試行できる", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送", paymentStatus: "支払い済み", paymentIntentId: "pi_cancel_2", items: [{ variantId: 8, quantity: 1 }] })
  const before = await stockOf(8)
  const gateway = new FakeGateway()
  gateway.refundFails = true
  assert.deepEqual(await cancelOrder(() => gateway, order.id), { refund: "failed" })
  assert.equal(await stockOf(8), before + 1)
  assert.deepEqual(await statusesOf(order.id), { shippingStatus: "キャンセル", paymentStatus: "返金エラー" })

  gateway.refundFails = false
  assert.deepEqual(await retryRefund(() => gateway, order.id), { refund: "refunded" })
  assert.equal((await statusesOf(order.id)).paymentStatus, "返金済み")
  assert.equal(gateway.refunds.at(-1)?.idempotencyKey, `order-${order.id}-refund`)
  await assert.rejects(retryRefund(() => gateway, order.id), { code: "REFUND_NOT_RETRYABLE" })
})

test("発送済み・キャンセル済み・存在しない注文はキャンセルできず、何も変えない", async () => {
  const before = await stockOf(8)
  for (const shippingStatus of ["発送済み", "キャンセル"]) {
    const order = await createOrder({ userId, shippingStatus, items: [{ variantId: 8, quantity: 1 }] })
    await assert.rejects(cancelOrder(() => new FakeGateway(), order.id), { code: "NOT_CANCELLABLE" })
    assert.equal((await statusesOf(order.id)).shippingStatus, shippingStatus)
  }
  await assert.rejects(cancelOrder(() => new FakeGateway(), 999_999), { code: "ORDER_NOT_FOUND" })
  assert.equal(await stockOf(8), before)
})

test("同じ注文への同時キャンセルは 1 回だけ成功し、在庫は 1 回分だけ戻る", async () => {
  const order = await createOrder({ userId, shippingStatus: "未発送", items: [{ variantId: 8, quantity: 4 }] })
  const before = await stockOf(8)
  const results = await Promise.allSettled([1, 2, 3].map(() => cancelOrder(() => new FakeGateway(), order.id)))
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1)
  assert.equal(await stockOf(8), before + 4)
})
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx --test tests/integration/adminOrders.test.mts tests/integration/payment.test.mts`
Expected: FAIL（`cancelOrder` が未定義）。`payment.test.mts` は `FakeGateway` 移動後も PASS のまま。

- [ ] **Step 3: `refund` と `cancelOrder`・`retryRefund` を実装する**
  - `cancelOrder`：仕様 §3 の手順 1〜3。トランザクション内の条件付き `updateMany` が 0 件なら、注文の有無で `ORDER_NOT_FOUND` / `NOT_CANCELLABLE` を投げる。明細ごとに `variant.update` で `increment`。確定後、共通の内部関数 `settleRefund(getGateway, order)` で返金し、成功で `返金済み`、例外で `console.error("Failed to refund order", orderId, paymentIntentId, error)` の後 `返金エラー` を保存する。
  - `retryRefund`：注文を取得し、なければ `ORDER_NOT_FOUND`、`canRetryRefund` が `false` なら `REFUND_NOT_RETRYABLE`、それ以外は `settleRefund`。
  - `StripePaymentGateway.refund`：仕様 §2「決済ゲートウェイ」の 5 分岐。`refunds.create({ payment_intent }, { idempotencyKey })`。`charge_already_refunded` は `Stripe.errors.StripeInvalidRequestError` の `code` で判定する。

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:integration && npm run typecheck`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add services tests/integration
git commit -m "feat: 注文のキャンセルで在庫を戻し、Stripe で返金する"
```

---

### Task 8: キャンセル・返金再試行の画面と E2E

**Files:**
- Create: `app/actions/admin/cancelOrderAction.ts`、`app/actions/admin/retryRefundAction.ts`、`app/admin/orders/[orderId]/CancelOrderForm.tsx`、`app/admin/orders/[orderId]/RetryRefundButton.tsx`
- Modify: `app/admin/orders/[orderId]/page.tsx`、`e2e/admin.spec.ts`、`e2e/payment.spec.ts`、`e2e/fixtures/store.ts`

**Interfaces:**
- Consumes: `cancelOrder`・`retryRefund`・`OrderAdminError`（Task 6・7）、`requireConfirmation`（Task 4）、`canCancelOrder`・`canRetryRefund`（Task 4）
- Produces:
  - `cancelOrderAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>>`
  - `retryRefundAction(_prevState: unknown, formData: FormData): Promise<ActionResult<{ message: string }>>`
  - 成功時の文言：キャンセル（`refund` が `none` / `refunded`）「注文をキャンセルしました」、キャンセル（`failed`）「キャンセルしましたが返金に失敗しました。再試行してください」、再試行（`refunded`）「返金しました」、再試行（`failed`）は `success: false` で「返金に失敗しました。時間をおいてもう一度お試しください」
  - `getGateway` には `() => new StripePaymentGateway()` を渡す。

- [ ] **Step 1: 失敗する E2E を書く**（`e2e/admin.spec.ts`）

```ts
test("確認チェックをしてキャンセルすると在庫が戻り、一覧と顧客側にキャンセルと表示される", async ({ page, shopper, admin, browser, database }) => {
  const stockBefore = await stockOfVariant(database, 0)
  const orderId = await placeOrderAs(shopper, page)
  const adminPage = await (await browser.newContext()).newPage()
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
})
```

（`stockOfVariant(database: pg.Pool, variantId: number): Promise<number>` は `e2e/admin.spec.ts` 内のヘルパーで、`SELECT stock FROM "Variant" WHERE id = $1` を返す。）

`e2e/payment.spec.ts`（Stripe テストキーがあるときだけ実行される既存構成）に追加：カードで購入した注文を管理者がキャンセルし、注文詳細の支払い状態が「返金済み」になる。

- [ ] **Step 2: 失敗を確認する**

Run: `npm run test:e2e -- e2e/admin.spec.ts`
Expected: FAIL（キャンセルボタンがない）

- [ ] **Step 3: Server Actions とフォームを実装する**
  - Action は Task 6 と同じ順序・エラー処理。`cancelOrderAction` は `requireConfirmation(formData.get("confirm"))`（失敗時「キャンセルの確認にチェックしてください」）。
  - `CancelOrderForm`：hidden の `orderId`、チェックボックス `name="confirm"`（ラベル「在庫を戻し、返金することを確認しました」）、`variant="destructive"` のボタン「注文をキャンセル」（チェックするまで無効、送信中も無効）。`canCancelOrder` が `true` のときだけ表示。
  - `RetryRefundButton`：hidden の `orderId`、ボタン「返金を再試行」。`canRetryRefund` が `true` のときだけ表示。
  - `e2e/fixtures/store.ts`：`shopper` の終了処理で在庫を戻す SQL に `AND o."shippingStatus" <> 'キャンセル'` を加える。キャンセル済みの注文はアプリが在庫を戻し済みなので、そのままだと在庫が二重に増える。上の E2E の後で variant 0 の在庫がテスト前と同じであることを `npm run test:e2e` を 2 回続けて実行して確かめる（2 回目も在庫制約のテストが通る）。
  - `prisma/reset-e2e.ts` は変更しない。管理者（user 2）は注文もカートも持たず、管理者テストが触る注文はすべて fixture の専用ユーザーのもので、終了時に削除されるため（仕様 §4 の「reset-e2e で初期化」は fixture 側で満たす。Task 9 で仕様に追記する）。

- [ ] **Step 4: すべてのテストが通ることを確認する**

Run: `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:e2e`
Expected: PASS
Run（Stripe テストキーがある場合）: `npm run test:e2e:stripe`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add app/actions/admin app/admin e2e
git commit -m "feat: 管理画面から注文のキャンセルと返金の再試行をできるようにする"
```

---

### Task 9: ドキュメントの更新と最終確認

**Files:**
- Modify: `README.md`（機能表に「管理画面」行：全注文の一覧・絞り込み、発送ステータスの変更、キャンセル時の在庫戻しと Stripe 返金。管理者デモアカウントはサインイン画面に記載）、`e2e/README.md`（対象に `admin.spec.ts` を追加）
- Modify: `docs/superpowers/specs/2026-10-25-admin-orders-design.md`（状態を「実装済み」にし、計画で具体化した 3 点＝絞り込みの slug、`ActionResult`、E2E データの後始末を reset-e2e ではなく fixture で行うことを追記）

- [ ] **Step 1: ドキュメントを更新する**
- [ ] **Step 2: 全チェックを実行する**

Run: `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:e2e && npm run build`
Expected: すべて PASS

- [ ] **Step 3: 開発サーバーで管理者・顧客の両方の操作を目で確認する**（`npm run dev`。管理者でサインイン → 一覧 → 絞り込み → 詳細 → ステータス変更 → キャンセル。顧客で `/admin` に入れないこと）

- [ ] **Step 4: コミットする**

```bash
git add README.md e2e/README.md docs/superpowers/specs/2026-10-25-admin-orders-design.md
git commit -m "docs: 管理画面の機能を README に追記"
```
