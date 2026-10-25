# 管理画面 ②：在庫・価格の編集 設計

- 作成日: 2026-10-26
- 状態: 実装済み
- 前提: [管理画面 ①](2026-10-25-admin-orders-design.md)（管理者ロール・`requireAdmin()`・管理画面レイアウト・注文管理）が main に入っていること

## 背景と目的

管理画面の 4 つのサブプロジェクトのうち ② として、既存の商品バリエーションの在庫と価格を管理者が変更できるようにする。

### 決定事項

- 在庫は増減分（例: `+10`、`-3`）で入力する。編集中に購入があっても正しく加減され、在庫が 0 未満になる減算は拒否する。
- 価格は新しい値を入力する。画面表示時の価格を条件に更新し、別の操作で先に変わっていればエラーにする。
- 1 ページで全バリエーションを編集する（現在 5 商品・10 バリエーション。ページ分割はしない）。

### 対象外

- 変更履歴（誰がいつ変更したか）、一括インポート
- 商品・バリエーションの追加・削除・名前や画像の変更（③で扱う）

## 1. 画面

### ナビゲーション

- `AdminHeader` のナビに「在庫・価格」（`/admin/inventory`）を「注文」の後に追加する。
- 狭い画面幅でヘッダーの要素（ロゴ・ナビ・サインアウト）がはみ出している。390px 幅でも横スクロールなしで全項目が収まるようにする（例: 狭い幅ではロゴの文字を省く、ボタンの余白を詰める）。ストア側のヘッダーは変更しない。

### `/admin/inventory`

- 見出し「在庫・価格」。`requireAdmin()` を呼ぶ（レイアウトに加えてページでも呼ぶ。①と同じ）。
- 商品ごとに見出し（商品名・販売区分のラベル）と、そのバリエーションの表を並べる。並び順は商品 ID 昇順、バリエーション ID 昇順。
- 表の列: バリエーション名・価格（既存の価格表示形式）・在庫（0 なら「売り切れ」バッジ）・操作。
- 操作列に 2 つのフォームを置く（各行に 1 組）。
  - **在庫の増減**: 数値入力（ラベル「{バリエーション名}の在庫の増減」、`aria-label` で行ごとに区別）、ボタン「在庫を更新」。
  - **価格の変更**: 数値入力（ラベル「{バリエーション名}の価格」、初期値は現在の価格）、hidden の `currentPrice`、ボタン「価格を更新」（現在の価格と同じなら無効）。
- 結果メッセージは各フォームの近くに出す（成功は既存の成功表示、失敗は `role="alert"`）。
- 商品が 0 件なら `EmptyState`。

## 2. データの流れと各層の役割

### 入力検証（`lib/validation.ts`）

- `requireStockDelta(value: unknown): number` — 整数で、0 以外、−9,999〜+9,999。外れたら `Error`。前後の空白と先頭の `+` を許す。
- `requirePrice(value: unknown): number` — 整数で 1〜9,999,999。外れたら `Error`。
- 定数 `MAX_STOCK_DELTA = 9999`、`MAX_PRICE = 9_999_999`。

### 読み取り

- 既存の `IProductRepository.findManyWithVariants()`（全商品とバリエーション、ID 昇順）を再利用する。新しい読み取りメソッドは作らない。

### 書き込み（`IVariantRepository` / `VariantRepository`）

- `adjustStock(variantId: number, delta: number): Promise<number | null>` — `updateMany({ where: { id, stock: { gte: -delta } }, data: { stock: { increment: delta } } })`（加算のときは条件 `stock >= 負の値` が常に真になる）。更新できたら更新後の在庫を返し、0 件なら `null`。
- `updatePrice(variantId: number, currentPrice: number, nextPrice: number): Promise<boolean>` — `updateMany({ where: { id, price: currentPrice }, data: { price: nextPrice } })`。1 件更新できたら `true`。
- `findStockAndPrice(variantId: number): Promise<{ stock: number, price: number } | null>` — エラー時の判定と表示に使う。

### サービス（`services/admin/inventoryAdminService.ts`、`server-only` は付けない＝統合テストから呼ぶため）

エラーは ① の `OrderAdminError` と同じ形の `InventoryAdminError`（`code` とメッセージ）。

| code | message |
| --- | --- |
| `VARIANT_NOT_FOUND` | バリエーションが見つかりません |
| `INSUFFICIENT_STOCK` | 在庫が足りないため減らせません（現在の在庫: {N}） |
| `STALE_PRICE` | 価格が別の操作で更新されています。最新の状態を確認してください |

- `adjustStock(repo: IVariantRepository, variantId: number, delta: number): Promise<{ stock: number }>`
  - `repo.adjustStock` が `null` なら `findStockAndPrice` で存在を確かめ、なければ `VARIANT_NOT_FOUND`、あれば `INSUFFICIENT_STOCK`（現在の在庫を埋め込む）。
- `updatePrice(repo: IVariantRepository, variantId: number, currentPrice: number, nextPrice: number): Promise<void>`
  - `currentPrice === nextPrice` は何もしないで成功。
  - `repo.updatePrice` が `false` なら、なければ `VARIANT_NOT_FOUND`、あれば `STALE_PRICE`。

在庫の増減は 1 回の条件付き UPDATE なので、購入処理（`stock >= 数量` を条件に減算）と同時に走っても、どちらの変更も失われず、在庫は 0 未満にならない。

### Server Actions（`app/actions/admin/`）

① の管理用 Action と同じ順序と戻り値（`ActionResult<{ message: string }>`）。

1. `requireAdmin()`
2. `requireNonNegativeInteger(formData.get("variantId"), "variantId")` と `requireStockDelta` / `requirePrice`（`currentPrice` も `requirePrice`）。検証エラーは「入力内容を確認してください」。
3. サービスを呼ぶ。`InventoryAdminError` はそのメッセージを返す。それ以外は `console.error` の後「処理に失敗しました。時間をおいてもう一度お試しください」。
4. 成功時もエラー時（`InventoryAdminError`）も `revalidatePath("/admin/inventory")` と `revalidatePath("/", "layout")`（ストアの商品一覧・詳細・カートの表示を更新するため。既存のカート操作 Action と同じ）。

| Action | 入力 | 成功メッセージ |
| --- | --- | --- |
| `adjustStockAction` | `variantId`・`delta` | 在庫を {N} に更新しました |
| `updatePriceAction` | `variantId`・`currentPrice`・`nextPrice` | 価格を {formatPrice(nextPrice)} に更新しました |

### 価格変更の影響

- 既存の注文: `OrderItem.priceAtPurchase` を保存しているため影響なし。
- カート: 表示・合計は表示時点の価格で計算されるため、次に開いたときから新しい価格。
- 決済中: カード決済は与信額と注文時のカート合計を比べ、異なれば既存の `CART_CHANGED` で注文を作らず与信を取り消す。新しい価格で請求されることはない。

## 3. テスト

### 単体（`lib/validation.test.mts`）

- `requireStockDelta`: `"10"`・`"+10"`・`" -3 "`・`"9999"`・`"-9999"` を受け付け、`"0"`・`"10000"`・`"-10000"`・`"1.5"`・`""`・`null`・`"abc"` を拒否。
- `requirePrice`: `"1"`・`"9999999"` を受け付け、`"0"`・`"-1"`・`"10000000"`・`"1.5"`・`""`・`null` を拒否。

### DB 統合（`tests/integration/adminInventory.test.mts` を新設し `npm run test:integration` に追加）

統合テストはファイルごとに並列実行されるため、テスト用の商品とバリエーションをファイル冒頭で作り、`after` で削除する（既存のバリエーション 0〜9 は使わない）。

- 在庫の加算・減算で更新後の在庫が返り、DB に反映される
- 0 未満になる減算は `INSUFFICIENT_STOCK`（メッセージに現在の在庫）で、在庫は変わらない
- 減算と購入相当の減算（`stock >= 数量` 条件付き）を同時に実行しても、合計どおりに減り 0 未満にならない
- 価格の更新。`currentPrice` が DB と食い違うと `STALE_PRICE` で、価格は変わらない
- 同じ価格への更新は成功し、何も変わらない
- 存在しないバリエーションは `VARIANT_NOT_FOUND`

### E2E（`e2e/admin.spec.ts` に追加）

- 顧客は `/admin/inventory` を開けない（`/products` へ移動）
- 管理者が在庫を増やすと、在庫の表示が更新され、ストアの商品ページで購入できる状態になる（テスト内で在庫を 0 にしてから増やし、終了時に元の在庫へ戻す）
- 管理者が価格を変えると、商品ページとカートの金額に反映される（終了時に元の価格へ戻す）
- 0 未満になる減算はエラーが表示され、在庫は変わらない
- 390px 幅で管理ヘッダーが横にはみ出さない（`document.documentElement.scrollWidth <= innerWidth`）
- 既存のスナップショットに差分がないこと

### 完了の条件

`npm run lint`・`npm run typecheck`・`npm test`・`npm run test:integration`・`npm run test:e2e` がすべて通ること。README の機能表の「管理画面」行に在庫・価格の編集を追記する。

## 実装時の変更点

- 管理画面のヘッダーを 390px 幅に収めるため、`StoreLogo` と `SignOut` に任意の `compact` プロパティを追加した（既定値は従来のマークアップのままで、ストア側のページは変わらない）。
- シードのバリエーション 1 を変更する E2E テストは、記録した元の値ではなくシード値（在庫 50・価格 800）へ戻す。`seedVariant1` フィクスチャのティアダウンで復元し、`prisma/reset-e2e.ts` もバリエーション 1 をリセットする。
