# 管理画面 ①：管理者ロール・アクセス制御・注文管理 設計

- 作成日: 2026-10-25
- 状態: 実装済み

## 背景と目的

Candy Rain Store に管理者用の画面を追加する。管理画面で扱う機能は次の 4 つで、順に別々の仕様・実装・PR として進める。

1. **基盤（管理者ロール・アクセス制御・管理画面の枠）＋注文管理** ← 本仕様
2. 在庫・価格の編集
3. 商品の登録・編集
4. ユーザー一覧の閲覧

本仕様は 1 を対象とする。2〜4 は本仕様で作る `requireAdmin()`・管理画面レイアウト・ナビゲーションを再利用する。

### 決定事項

- 公開デモで管理者デモアカウントを公開し、閲覧者も管理機能を試せるようにする（変更はデモ DB に反映される）。
- 管理者アカウントは顧客アカウントとは別にする。管理者はストア側で買い物しない。
- 発送ステータスは「未発送・発送準備中・発送済み・キャンセル」。
- キャンセルは未発送・発送準備中の注文だけ可能。在庫を戻し、カード決済は Stripe で全額返金する。キャンセル後は戻せない。
- 顧客側の注文履歴・注文詳細には、変更後のステータスがそのまま表示される。

### 対象外

- 在庫・価格・商品・ユーザーの管理（②〜④で扱う）
- 一部返金、部分キャンセル
- 管理者の追加・権限変更の画面（シードでのみ作成する）
- 管理操作の監査ログ

## 1. 画面構成とアクセス制御

### ロールと認証

- `User` に `role` 列を追加する。Prisma の enum `Role`（`CUSTOMER` / `ADMIN`）、既定値は `CUSTOMER`。マイグレーションを 1 本追加する。
- シードで管理者 `admin@mail.com` / `demo-password` を作成する（既存の顧客デモアカウントと同じ作り方）。管理者にはカートを作らない。
- Auth.js の `authorize` が返すユーザーに `role` を含め、`jwt` / `session` コールバックで `token.role` / `session.user.role` に載せる。`types/` の型拡張に `role` を追加する。
- `proxy.ts` はセッションの `role` で振り分ける。これは表示上の振り分けであり、権限の最終判断ではない。
  - 非管理者が `/admin` 配下を開いたら `/products` へリダイレクト
  - 管理者がストア側のページ（`/admin`・`/signin`・`/signout` 以外）を開いたら `/admin` へリダイレクト
  - サインイン済みの管理者が `/signin` を開いたら `/admin` へリダイレクト
- `IUserRepository` / `UserRepository` に `findRoleByUserId(userId)` を、`services/accountService.ts` に `isAdmin(repo, userId)` を追加する。
- `lib/auth.ts` に `requireAdmin()` を追加する。セッションのユーザー ID で `isAdmin` を呼んで DB の `role` を確認し、`ADMIN` でなければ未サインイン時は `/signin`、それ以外は `/products` へリダイレクトする。戻り値は管理者のユーザー ID。管理画面のレイアウト・各ページ・すべての管理用 Server Action の先頭で呼ぶ。

### レイアウトの整理

現在のルートレイアウト（`app/layout.tsx`）はストアのヘッダー・フッターとカート件数の取得を全ページで行っており、カートのない管理者ではエラーになる。必要な範囲だけ次のように分ける。URL は変わらない。

- `app/layout.tsx`：`<html>` / `<body>`、フォント、メタデータだけを持つ。
- `app/(routes)/layout.tsx`（新設）：`StoreHeader`・`<main className="page-shell ...">`・`StoreFooter` とカート件数の取得を移す。
- `app/page.tsx` を `app/(routes)/page.tsx` に移す。
- `app/not-found.tsx` はストアのヘッダー・フッターを伴って表示されるよう、必要なら同等の枠で包む（スナップショットで差分がないことを確認する）。
- `app/admin/layout.tsx`（新設）：`requireAdmin()` を呼び、管理画面用ヘッダー（ロゴ・「注文」ナビ・サインアウト）とメイン領域を持つ。

### ページ

| URL | 内容 |
| --- | --- |
| `/admin` | `/admin/orders` へリダイレクトする |
| `/admin/orders` | 全ユーザーの注文一覧。列は注文番号・注文日時・注文者名・合計金額・支払い状態・発送状態。新しい順。発送状態で絞り込める（`?shippingStatus=` の URL パラメーター。既存の販売区分フィルターと同じ方式）。不正な値は絞り込みなしとして扱う |
| `/admin/orders/[orderId]` | 注文詳細。明細（バリエーション名・購入時価格・数量）、送料・合計、注文者名・メールアドレス、お届け先、支払い方法、支払い状態・発送状態。発送ステータスの変更フォーム、キャンセルフォーム、条件を満たすときは「返金を再試行」ボタン。存在しない ID は `notFound()` |

- サインイン画面の「入力例」に管理者アカウントを追記する。
- 既存の UI コンポーネント（`components/ui` の Table・Badge・Card・Button、`app/components` の `PageHeader`・`FormMessage`・`EmptyState` など）を再利用する。

## 2. データの流れと各層の役割

既存の構成（`app/` → `services/` → `repositories/` → Prisma）に合わせる。

### ステータスの定義

`services/checkout/orderStatus.ts` に定数を追加する。DB は既存どおり文字列カラムのまま。

| 定数 | 値 |
| --- | --- |
| `INITIAL_SHIPPING_STATUS`（既存） | 未発送 |
| `PREPARING_SHIPPING_STATUS` | 発送準備中 |
| `SHIPPED_SHIPPING_STATUS` | 発送済み |
| `CANCELLED_SHIPPING_STATUS` | キャンセル |
| `REFUNDED_PAYMENT_STATUS` | 返金済み |
| `REFUND_ERROR_PAYMENT_STATUS` | 返金エラー |

### 遷移ルール

`services/admin/shippingStatusTransition.ts` に純粋関数を置く。

- `canChangeShippingStatus(from, to)`：未発送・発送準備中・発送済みの 3 つの間で、`from !== to` なら `true`。それ以外（キャンセルへの変更、キャンセルからの変更、未知の値、同じ値）は `false`。
- `canCancelOrder(shippingStatus)`：未発送・発送準備中なら `true`。
- `canRetryRefund(shippingStatus, paymentStatus)`：キャンセル かつ 返金エラー なら `true`。

発送ステータスの変更フォームではキャンセルを選べない。キャンセルは専用のキャンセル操作からだけ行う。

### 読み取り

`IOrderRepository` / `OrderRepository` に管理者用メソッドを追加する。

- `findManyForAdmin(filter: { shippingStatus?: string }): Promise<AdminOrderSummary[]>`
  - 全ユーザーの注文を `orderedAt desc, id desc` で返す。
  - `AdminOrderSummary`：`id`・`orderedAt`・`totalPrice`・`paymentStatus`・`shippingStatus`・`customerName`（姓名）。
- `findByIdForAdmin(orderId: number): Promise<AdminOrderDetail | null>`
  - 所有者を問わず 1 件返す。
  - `AdminOrderDetail`：`AdminOrderSummary` に加え `shippingPrice`・`paymentMethodLabel`・`paymentIntentId` の有無・`customerEmail`・お届け先（郵便番号・都道府県・住所 1・住所 2）。

表示用の型は `repositories/entities` ではなくリポジトリのインターフェース側で定義し、既存の `Order` エンティティは変更しない。明細は既存の `getOrderItemsByOrderId` を再利用する。

`services/admin/adminQueryService.ts`（`server-only`）を新設し、`storeQueryService` と同じ薄い関数として `getOrdersForAdmin` / `getOrderForAdmin` を置く。

### 書き込み

`services/admin/orderAdminService.ts` を新設する。エラーは `checkoutService` の `CheckoutError` と同じ形の `OrderAdminError`（`code` とメッセージ）で返す。

| code | 意味 |
| --- | --- |
| `ORDER_NOT_FOUND` | 注文が存在しない |
| `INVALID_TRANSITION` | 遷移ルール上許可されない変更 |
| `STALE_STATUS` | 画面表示時の発送状態と DB が食い違っている（別の操作で更新済み） |
| `NOT_CANCELLABLE` | キャンセルできない状態 |
| `REFUND_NOT_RETRYABLE` | 返金の再試行ができない状態 |

- `updateShippingStatus(orderId, currentStatus, nextStatus)`
  - `canChangeShippingStatus(currentStatus, nextStatus)` が `false` なら `INVALID_TRANSITION`。
  - `updateMany({ where: { id: orderId, shippingStatus: currentStatus }, data: { shippingStatus: nextStatus } })`。更新件数が 0 なら、注文が存在しなければ `ORDER_NOT_FOUND`、存在すれば `STALE_STATUS`。
  - `currentStatus` はフォームの hidden 項目で送る（画面表示時の値）。
- `cancelOrder(gateway, orderId)`：セクション 3 を参照。
- `retryRefund(gateway, orderId)`：セクション 3 を参照。

### 決済ゲートウェイ

`PaymentGateway` に `refund(paymentIntentId: string, idempotencyKey: string): Promise<void>` を追加する。

`StripePaymentGateway.refund` の動作：

1. PaymentIntent を取得する。
2. `requires_capture`（与信のみ）なら `paymentIntents.cancel` で与信を取り消す。
3. `succeeded`（売上確定済み）なら `refunds.create({ payment_intent })` を冪等キー付きで呼ぶ。Stripe が `charge_already_refunded` を返した場合は成功扱いにする。
4. `canceled` なら何もしない。
5. それ以外の状態はエラーを投げる。

既存のテスト用 `FakeGateway`（`tests/integration/payment.test.mts`）にも `refund` を追加する。

### Server Actions

`app/actions/admin/` に置く。いずれも次の順で処理する。

1. 先頭で `requireAdmin()` を呼ぶ。
2. `lib/validation.ts` に追加する検証関数で入力を検証する。
3. Service を呼び、`OrderAdminError` は画面用メッセージに変換する。想定外のエラーはログに出して汎用メッセージを返す。
4. `revalidatePath("/admin/orders", "layout")` と `revalidatePath("/orders", "layout")` で管理側・顧客側を再検証する。
5. 既存の `FormActionState` の形で結果を返す。

| Action | 入力 |
| --- | --- |
| `updateShippingStatusAction` | `orderId`・`currentStatus`・`nextStatus` |
| `cancelOrderAction` | `orderId`・`confirm`（確認チェック。`on` 以外は拒否） |
| `retryRefundAction` | `orderId` |

ゲートウェイは、決済を伴う注文の処理で必要になったときだけ `StripePaymentGateway` を生成する（Stripe 未設定環境で決済なしの注文をキャンセルできるようにするため）。

## 3. キャンセル処理の順番と失敗時の扱い

Stripe での返金は外部 API 呼び出しで、DB のトランザクションと一緒には取り消せない。そのため DB を先に確定し、返金は後から行う。失敗した場合は状態として記録し、やり直せるようにする。売上確定の失敗を「決済エラー」として記録している既存の方針と同じ考え方。

### `cancelOrder(gateway, orderId)`

1. **トランザクション内でキャンセルを確定する**
   - `updateMany({ where: { id: orderId, shippingStatus: { in: ["未発送", "発送準備中"] } }, data: { shippingStatus: "キャンセル" } })`。
   - 更新件数が 0 なら、注文が存在しなければ `ORDER_NOT_FOUND`、存在すれば `NOT_CANCELLABLE` を投げる（トランザクションはロールバックされ、何も変わらない）。
   - 注文明細ごとに `variant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } })` で在庫を戻す。
   - 途中で失敗した場合はロールバックし、在庫もステータスも元のまま残す。
   - 条件付き更新により、同じ注文への同時キャンセルは 1 回だけ成功し、在庫は 1 回分だけ戻る。
2. **トランザクション確定後に支払いを処理する**（`settleRefund`）

   | 注文の支払い | 処理 | 支払い状態 |
   | --- | --- | --- |
   | 決済なし（`paymentIntentId` が null） | ゲートウェイを呼ばない | 変更しない |
   | 決済あり（支払い済み・決済エラー） | `gateway.refund(paymentIntentId, "order-{id}-refund")` | 返金済み |

3. **返金に失敗した場合**
   - 支払い状態を「返金エラー」にし、注文 ID・PaymentIntent ID・エラー内容を `console.error` に出す。
   - キャンセル（発送状態・在庫戻し）は確定したままにする。
   - 戻り値で返金失敗を伝え、画面に「キャンセルしましたが返金に失敗しました。再試行してください」と表示する。

戻り値は `{ refund: "none" | "refunded" | "failed" }`。

### `retryRefund(gateway, orderId)`

- 注文を取得し、`canRetryRefund` が `false` なら `REFUND_NOT_RETRYABLE`。
- 手順 2・3 だけを行う。冪等キーが同じなので二重返金にならない。

### 誤操作の防止

- キャンセルフォームには確認用チェックボックス（「在庫を戻し、返金することを確認しました」）を置き、オンにするまで送信ボタンを無効にする。サーバー側でも `confirm` を検証する。
- キャンセルできない状態（発送済み・キャンセル）の注文ではキャンセルフォームを表示しない。キャンセル済みの注文では発送ステータスの変更フォームも表示しない。

### 顧客側の表示

注文履歴・注文詳細の既存バッジに「キャンセル」「返金済み」「返金エラー」がそのまま表示される。顧客側の画面は変更しない。

## 4. テスト

### 単体テスト（`npm test` に追加）

- `services/admin/shippingStatusTransition.test.mts`
  - 3 状態の間は前後どちらにも変更できる
  - 同じ値への変更、キャンセルへの変更、キャンセルからの変更、未知の値は拒否する
  - `canCancelOrder`・`canRetryRefund` の真偽
- `lib/validation.test.mts`：注文 ID・発送ステータス値・キャンセル確認チェックの検証ケースを追加する

### DB 統合テスト（`tests/integration/adminOrders.test.mts` を新設し `npm run test:integration` に追加）

決済は `FakeGateway`（`refund` の成否を切り替え可能）を使う。在庫は他のテストと競合しないよう専用のバリエーションを使う。

- `updateShippingStatus`
  - 正常に遷移する
  - 許可されない遷移は `INVALID_TRANSITION` で、DB は変わらない
  - `currentStatus` が DB と食い違うと `STALE_STATUS`
- `cancelOrder`
  - 決済ありの注文：在庫が数量分戻り、発送状態がキャンセル、支払い状態が返金済み。`refund` が冪等キー付きで 1 回だけ呼ばれる
  - 決済なしの注文：ゲートウェイを呼ばず、支払い状態は変わらない
  - 返金失敗：キャンセルと在庫戻しは確定し、支払い状態が返金エラー。`retryRefund` で返金済みになる
  - 発送済み・キャンセル済みの注文：`NOT_CANCELLABLE` で、在庫もステータスも変わらない
  - 同じ注文への同時キャンセル（`Promise.allSettled`）：1 回だけ成功し、在庫は 1 回分だけ戻る
- `isAdmin`（`requireAdmin` が使う DB のロール確認）：顧客ユーザーは `false`、管理者は `true`、存在しないユーザーは `false`

### E2E（`e2e/admin.spec.ts` を新設）

- 管理者でサインインすると `/admin/orders` に移動し、注文一覧が表示される
- 顧客が `/admin` を開くと `/products` へ、管理者がストアのページを開くと `/admin` へ移動する
- 顧客が注文 → 管理者が「発送準備中」に変更 → 顧客の注文詳細に反映される
- 確認チェックなしではキャンセルできない。チェックしてキャンセルすると一覧でキャンセルと表示され、在庫が戻る（Stripe なしの注文で確認）
- `e2e/fixtures/store.ts` に管理者のサインイン用フィクスチャを追加する
- `prisma/reset-e2e.ts` で管理者テストが変更したデータも初期化する
- 既存のスナップショットテストに差分がないことで、レイアウト整理後もストア側の見た目が変わっていないことを確認する
- `test:e2e:stripe` 構成に、カード決済の注文をキャンセルして返金済みになるケースを 1 つ追加する（テストキーがあるときだけ実行）

### 完了の条件

`npm run lint`・`npm run typecheck`・`npm test`・`npm run test:integration`・`npm run test:e2e` がすべて通ること。README の機能表に管理画面を追記する。

## 実装時の変更点

計画・実装の過程で、仕様から次のとおり具体化・変更した。

1. 発送状態の絞り込みは `?shippingStatus=<slug>` とし、slug は `unshipped`・`preparing`・`shipped`・`cancelled` を使う。
2. 管理用 Server Action の戻り値は `FormActionState` ではなく既存の `ActionResult<{ message: string }>` にした（項目別エラーがないため）。
3. E2E のデータの後始末は `prisma/reset-e2e.ts` ではなく shopper フィクスチャで行う。在庫を戻すときはキャンセル済みの注文を除外する（キャンセル時にすでに戻っているため）。
4. DB 統合テストは、クエリサービスが server-only のため、`OrderRepository` を直接呼び出す。
5. キャンセル・返金再試行のフォームは、操作できない状態でも常にマウントしたまま何も描画しない。再検証後も結果メッセージが消えないようにするため。
