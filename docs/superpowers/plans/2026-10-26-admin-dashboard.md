# 管理画面：ダッシュボード 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/dashboard` に対応待ち・売上（今日・今月）・最新の注文・商品の状態を表示し、`/admin` をダッシュボードへ移動させる。

**Architecture:** 日本時間の境界と商品の状態の集計は `lib/` の純粋関数、注文とバリエーションの集計は既存の Repository に追加し、`services/admin/dashboardService.ts` が並行に呼んでまとめる。画面は ①〜③ の管理画面レイアウトの下に置く。

**Tech Stack:** Next.js 16（App Router）、React 19、Prisma 7 / PostgreSQL、Node.js Test Runner + tsx、Playwright

**Spec:** `docs/superpowers/specs/2026-10-26-admin-dashboard-design.md`

## Global Constraints

- Next.js はこのリポジトリの版に破壊的変更がある。Next.js の API を使う前に `node_modules/next/dist/docs/` の該当ガイドを読む（AGENTS.md）。
- 層は `app/` → `services/` → `repositories/` → Prisma。管理用のページは先頭で `requireAdmin()` を呼ぶ。
- 「今日」「今月」は日本時間（UTC+9、夏時間なし）。売上はキャンセル（`CANCELLED_SHIPPING_STATUS`）以外の注文の `totalPrice`（送料込み）。
- 状態の文字列は `services/checkout/orderStatus.ts` の定数を使う（`INITIAL_SHIPPING_STATUS`「未発送」、`PREPARING_SHIPPING_STATUS`「発送準備中」、`REFUND_ERROR_PAYMENT_STATUS`「返金エラー」）。リンクの slug は `shippingStatusSlugs`。
- 統合テストはファイルごとに並列実行される。全体の件数に依存する検証は統合テストに書かない（E2E に書く）。
- 画面の文言・コミットメッセージは日本語。コミット末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける。

## Review Focus

1. **日本時間の 0:00〜9:00**（UTC ではまだ前日）：その時間の注文が「今日」に入る → Task 1 の単体テスト。
2. **キャンセルした注文**：件数・売上の両方から外れる → Task 2 の統合テスト。
3. **返金エラーが 6 件以上**：新しい順に 5 件だけ表示 → Task 2 の統合テスト（`limit`）。
4. **非公開の売り切れバリエーション**：売り切れの数に入らない → Task 4 の E2E。
5. **商品が 1 つもない状態**：0 件の状態も 0 と表示する → Task 1 の単体テスト。

---

### Task 1: 日本時間の境界と商品の状態の集計

**Files:**
- Create: `lib/tokyoTime.ts`、`lib/tokyoTime.test.mts`
- Modify: `lib/productStatus.ts`、`lib/productStatus.test.mts`、`package.json`（`npm test` に `lib/tokyoTime.test.mts`）

**Interfaces:**
- Produces: `tokyoPeriodStarts(now: Date): { dayStart: Date, monthStart: Date }`、`countStoreStatuses(products: { isPublished: boolean, variants: { isPublished: boolean }[] }[]): Record<StoreStatus, number>`

- [ ] **Step 1: テストを書く**

```ts
test("日本時間の日中は、その日の 0:00 とその月の 1 日 0:00 を返す", () => {
  assert.deepEqual(tokyoPeriodStarts(new Date("2026-10-26T03:00:00Z")), {
    dayStart: new Date("2026-10-25T15:00:00Z"), monthStart: new Date("2026-09-30T15:00:00Z"),
  })
})
test("UTC ではまだ前日でも、日本時間の翌日として扱う", ...)  // 2026-10-31T15:30Z → dayStart 2026-10-31T15:00Z、monthStart 2026-10-31T15:00Z（11/1）
test("年末から年始への切り替わり", ...)                    // 2026-12-31T15:00Z → dayStart・monthStart とも 2026-12-31T15:00Z
test("日本時間の 0:00 ちょうどの直前は前日", ...)           // 2026-10-25T14:59:59Z → dayStart 2026-10-24T15:00Z
```

`lib/productStatus.test.mts` に `countStoreStatuses`（3 状態を数え、空配列なら `{ PUBLISHED: 0, UNPUBLISHED: 0, NOT_LISTED: 0 }`）。

- [ ] **Step 2: 失敗を確認** — `npx tsx --test lib/tokyoTime.test.mts lib/productStatus.test.mts` → FAIL
- [ ] **Step 3: 実装** — `now` に 9 時間足した時刻の UTC の年月日で 0:00 を作り、9 時間引く。
- [ ] **Step 4: 通過を確認** — 同じコマンドで PASS
- [ ] **Step 5: コミット** — `feat: 日本時間の日・月の境界と商品の状態の集計を追加`

### Task 2: 注文とバリエーションの集計、ダッシュボードのサービス

**Files:**
- Create: `services/admin/dashboardService.ts`、`tests/integration/adminDashboard.test.mts`
- Modify: `repositories/interfaces/IOrderRepository.ts`、`repositories/implementations/orderRepository.ts`、`repositories/interfaces/IVariantRepository.ts`、`repositories/implementations/variantRepository.ts`、`package.json`（`test:integration` に追加）

**Interfaces:**
- Consumes: `tokyoPeriodStarts`・`countStoreStatuses`（Task 1）、`listProductsForAdmin`・`MAX_PRODUCTS`
- Produces:
  - `IOrderRepository.findManyForAdmin(filter: { shippingStatus: ShippingStatus | null, paymentStatus?: string, limit?: number })`（既存の呼び出しは変えない）
  - `IOrderRepository.countByShippingStatus(): Promise<Partial<Record<string, number>>>`
  - `IOrderRepository.countByPaymentStatus(paymentStatus: string): Promise<number>`
  - `IOrderRepository.summarizeSales(since: Date): Promise<{ orderCount: number, totalPrice: number }>`
  - `IVariantRepository.countSoldOutOnSale(): Promise<number>`
  - `type DashboardSummary = { pending: { unshipped: number, preparing: number, refundErrors: number, soldOut: number }, refundErrorOrders: AdminOrderSummary[], sales: { today: SalesSummary, month: SalesSummary }, recentOrders: AdminOrderSummary[], products: { counts: Record<StoreStatus, number>, total: number, limit: number } }`（`SalesSummary = { orderCount: number, totalPrice: number }`）
  - `getDashboardSummary(repos: { order: IOrderRepository, variant: IVariantRepository, product: IProductRepository }, now: Date): Promise<DashboardSummary>`

- [ ] **Step 1: 統合テストを書く** — 全体の件数に左右されないよう、テスト専用のユーザーの注文だけで確かめる。

```ts
test("summarizeSales はキャンセル以外の注文の件数と totalPrice を合計する", ...)
  // 専用ユーザーに orderedAt が 2099 年の注文を 3 件（1500・2500・キャンセルの 9000）作り、summarizeSales(2099-01-01) が { orderCount: 2, totalPrice: 4000 }
test("findManyForAdmin は支払いステータスと件数で絞れる（新しい順）", ...)
  // 一意な支払いステータス `test-${Date.now()}` の注文を 6 件 → { paymentStatus, limit: 5 } で 5 件、先頭が最新
test("countByPaymentStatus は指定の支払いステータスの注文を数える", ...)  // 上の一意なステータスで 6
```

- [ ] **Step 2: 失敗を確認** — `npx tsx --test tests/integration/adminDashboard.test.mts` → FAIL
- [ ] **Step 3: 実装** — `summarizeSales` は `aggregate({ where: { orderedAt: { gte: since }, shippingStatus: { not: CANCELLED } }, _count, _sum: { totalPrice } })`（合計が `null` なら 0）。`countByShippingStatus` は `groupBy`。`getDashboardSummary` は `tokyoPeriodStarts(now)` の境界で各集計を `Promise.all` で実行する。`dashboardService.ts` は `import "server-only"`（統合テストからは Repository だけを呼ぶ）。
- [ ] **Step 4: 通過を確認** — 同じコマンドと `npm run test:integration`・`npx tsc --noEmit` が PASS
- [ ] **Step 5: コミット** — `feat: ダッシュボード用の注文とバリエーションの集計を追加`

### Task 3: ダッシュボードの画面と `/admin` のリダイレクト

**Files:**
- Create: `app/admin/dashboard/page.tsx`
- Modify: `app/admin/page.tsx`、`e2e/fixtures/store.ts`（`admin.signIn` の待ち先）、`e2e/admin.spec.ts`（サインイン後の移動先の期待値）、`e2e/README.md`、`README.md`

**Interfaces:**
- Consumes: `getDashboardSummary`（Task 2）

- [ ] **Step 1: 既存 E2E の期待値を変える（失敗するテストにする）** — `admin.signIn` の `toHaveURL(/\/admin\/orders$/)` と、`admin.spec.ts` の「管理者はサインイン後に注文管理へ移動し、ストアのページは開けない」を `/admin/dashboard` と見出し「ダッシュボード」にする。
- [ ] **Step 2: 失敗を確認** — `npx playwright test e2e/admin.spec.ts -g "サインイン後"` → FAIL（`/admin/orders` に移動する）
- [ ] **Step 3: 実装** — `app/admin/page.tsx` は `redirect("/admin/dashboard")`。ダッシュボードは仕様の「1. 画面」の 4 区画（`PageHeader`・`Card`・`Table`・`EmptyState` を既存の管理画面と同じ使い方で）。件数のリンクは `shippingStatusSlugs` から作る。
- [ ] **Step 4: 通過を確認** — `npx playwright test e2e/admin.spec.ts` が PASS
- [ ] **Step 5: README** — 機能表の「管理画面」行の先頭に「ダッシュボード（対応待ち・売上・最新の注文・商品の状態）」を追記。`e2e/README.md` の `admin.spec.ts` の説明の `/admin/orders へ` を `/admin/dashboard へ` に。
- [ ] **Step 6: コミット** — `feat: 管理画面にダッシュボードを追加し、/admin から移動する`

### Task 4: ダッシュボードの E2E

**Files:**
- Create: `e2e/adminDashboard.spec.ts`
- Modify: `e2e/admin.spec.ts`（390px の確認に `/admin/dashboard` を追加）、`e2e/README.md`

- [ ] **Step 1: テストを書く**

```ts
test("未サインインで /admin・/admin/dashboard を開くとサインイン画面へ移動する", ...)
test("顧客はダッシュボードを開けない", ...)                 // /admin/dashboard → /products
test("管理者は /admin とロゴのリンクからダッシュボードを開ける", ...)
test("表示される数が DB の集計と一致する", ...)
  // SQL: 未発送・発送準備中・返金エラーの件数、公開中かつ在庫 0 のバリエーション数、
  // 今日・今月（orderedAt >= date_trunc('day'|'month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo'）かつキャンセル以外の件数と totalPrice 合計
  // 画面の各カード（data-testid ではなく見出しの role で区画を特定）がその値を表示する
test("注文すると最新の注文と未発送・今日の売上に反映され、キャンセルすると売上から外れる", ...)
test("非公開の売り切れバリエーションは売り切れの数に入らない", ...)  // seedVariant1 で在庫 0 → 数が +1、非公開にすると元に戻る（終了時に公開へ戻す）
```

`admin.spec.ts` の 390px テストのパスに `/admin/dashboard` を加える。

- [ ] **Step 2: 実行して通過を確認** — `npx playwright test e2e/adminDashboard.spec.ts e2e/admin.spec.ts` が PASS
- [ ] **Step 3: 最終確認** — `npm run lint`・`npm run typecheck`・`npm test`・`npm run test:integration`・`npm run test:e2e` がすべて PASS。仕様書の状態を「実装済み」にする
- [ ] **Step 4: コミット** — `test: ダッシュボードの E2E を追加`
