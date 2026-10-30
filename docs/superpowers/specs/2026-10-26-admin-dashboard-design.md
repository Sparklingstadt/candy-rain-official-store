# 管理画面：ダッシュボード 設計

> 2026-10-26 追記：売上の定義・表示・Repository の返り値は [金額指標の説明](../../dashboard-sales-definitions.md) で更新。以下は PR #105 時点の設計記録。

- 作成日: 2026-10-26
- 状態: 実装済み
- 前提: 管理画面 ①〜③（注文管理・在庫と価格・商品の登録と編集）が main に入っていること

## 背景と目的

管理者がサインインしたときに、対応が必要なこと・売上・最新の注文・商品の状態をひと目で確認できるページ `/admin/dashboard` を追加する。`/admin` はダッシュボードへ移動させる。

### 決定事項

- `/admin` は `/admin/dashboard` へリダイレクトする。管理者はサインイン後に `/admin` を通るため、サインイン後の行き先もダッシュボードになる。
- 未サインインで `/admin`・`/admin/dashboard` を開くとサインイン画面へ移動する（`proxy.ts` が未サインインのページ要求をすべて `/signin` へ送るため、既にこの動作になっている。テストを追加する）。
- 管理ヘッダーのナビには項目を足さない。390px 幅で 4 項目は収まりにくく、ロゴ（「管理画面」）のリンク `/admin` がダッシュボードの入口になる。
- 「今日」「今月」は日本時間（Asia/Tokyo）で区切る。サーバー（Vercel）は UTC で動くため、境界は明示的に計算する。
- 売上はキャンセル（発送ステータス「キャンセル」）を除いた注文の `totalPrice`（送料込み）の合計。決済なしで確定した注文（Stripe 未設定時）も含める。

### 対象外

- グラフ・期間を選んだ集計・CSV 出力
- 注文一覧の支払いステータスでの絞り込み（返金エラーはダッシュボードに直接一覧表示する）
- ナビへの「ダッシュボード」項目の追加

## 1. 画面（`/admin/dashboard`）

見出し「ダッシュボード」。`requireAdmin()` を呼ぶ（レイアウトに加えてページでも呼ぶ。①〜③と同じ）。上から次の 4 つの区画を置く。

### 対応待ち

| 項目 | 内容 | リンク |
| --- | --- | --- |
| 未発送 | 発送ステータス「未発送」の注文数 | `/admin/orders?shippingStatus=unshipped` |
| 発送準備中 | 発送ステータス「発送準備中」の注文数 | `/admin/orders?shippingStatus=preparing` |
| 返金エラー | 支払いステータス「返金エラー」の注文数 | 下の一覧 |
| 売り切れ | 公開中（商品・バリエーションとも公開）で在庫 0 のバリエーション数 | `/admin/inventory` |

- 返金エラーが 1 件以上あれば、新しい順に最大 5 件（注文番号・注文日時・注文者・金額）を表示し、各行から注文詳細（再試行ボタンがある）へ移動できる。
- 非公開のバリエーションは顧客に見えないため、売り切れの数に含めない。

### 売上

- 「今日」と「今月」のそれぞれについて、注文件数と売上合計（`formatPrice`）を表示する。「送料込み・キャンセルを除く」と注記する。
- 今日は日本時間のその日の 0:00 以降、今月は日本時間のその月の 1 日 0:00 以降に注文されたもの。

### 最新の注文

- 新しい順に 5 件（注文日時・注文番号・注文者・金額・発送ステータス）。各行から注文詳細へ移動できる。「注文一覧へ」のリンクを置く。
- 注文が 0 件なら `EmptyState`。

### 商品の状態

- 公開中・非公開・ストアに未表示（③の `storeStatusOf` と同じ判定）の商品数と、登録数（例「12 / 30 件」、`MAX_PRODUCTS`）。「商品へ」のリンク（`/admin/products`）を置く。

## 2. データの流れと各層の役割

### 日本時間の境界（`lib/tokyoTime.ts`）

- `tokyoPeriodStarts(now: Date): { dayStart: Date, monthStart: Date }` — `now` の日本時間での日付の 0:00 と、その月の 1 日 0:00 を UTC の `Date` で返す。日本時間は夏時間がないため UTC+9 で計算してよい。

### 商品の状態の集計（`lib/productStatus.ts`）

- `countStoreStatuses(products): Record<StoreStatus, number>` — `storeStatusOf` で数える。

### Repository

- `IOrderRepository.findManyForAdmin(filter)` の `filter` に任意の `paymentStatus` と `limit` を加える（既存の呼び出しは変わらない）。最新の注文（`limit: 5`）と返金エラー（`paymentStatus: "返金エラー"`、`limit: 5`）に使う。
- `IOrderRepository.countByShippingStatus(): Promise<Partial<Record<string, number>>>`（`groupBy`）
- `IOrderRepository.countByPaymentStatus(paymentStatus: string): Promise<number>`
- `IOrderRepository.summarizeSales(since: Date): Promise<{ orderCount: number, totalPrice: number }>` — `orderedAt >= since` かつ発送ステータスがキャンセル以外。
- `IVariantRepository.countSoldOutOnSale(): Promise<number>` — `stock <= 0`、`isPublished: true`、`product.isPublished: true`。

### サービス（`services/admin/dashboardService.ts`、`server-only`）

- `getDashboardSummary(repos: { order, variant, product }, now: Date)` が 4 区画の値をまとめて返す。各クエリは `Promise.all` で並行に実行する。

### 画面

- `app/admin/page.tsx` のリダイレクト先を `/admin/dashboard` にする。
- `app/admin/dashboard/page.tsx` を新設する。

## 3. テスト

### 単体

- `lib/tokyoTime.test.mts`：日本時間の日中、UTC ではまだ前日だが日本時間では翌日の時間帯（例: `2026-10-31T15:30Z` は日本時間 11/1 0:30）、月末から月初への切り替わり、年末から年始への切り替わり。
- `lib/productStatus.test.mts`：`countStoreStatuses` が 3 つの状態を数え、0 件の状態も 0 で返す。

### E2E（`e2e/adminDashboard.spec.ts`。workers は 1 なので順に実行され、他のテストが途中で数を変えない）

- 管理者はサインイン後にダッシュボードへ移動し、`/admin` もダッシュボードへ移動する
- 未サインインで `/admin`・`/admin/dashboard` を開くとサインイン画面へ移動する。顧客は `/admin/dashboard` を開けない
- 表示される未発送・発送準備中・返金エラー・売り切れの数、今日・今月の件数と売上、商品の状態の数が、同じ時点の DB を SQL（日本時間の境界は `AT TIME ZONE 'Asia/Tokyo'`）で集計した値と一致する
- 顧客が注文すると、最新の注文の先頭に表示され、未発送の数が 1 増え、今日の売上に加わる。キャンセルすると売上から外れる
- ロゴのリンクからダッシュボードを開ける。390px 幅で横にはみ出さない
- 既存の E2E で「管理者はサインイン後に `/admin/orders` へ移動する」としている箇所（fixture の `admin.signIn` を含む）を `/admin/dashboard` に変える。`e2e/README.md` も合わせる
- 既存のスナップショットに差分がないこと

売上や件数は全体の集計で、統合テストはファイルごとに並列実行され他のファイルが注文を作るため、集計の正しさは順に実行される E2E で確かめる。

### 完了の条件

`npm run lint`・`npm run typecheck`・`npm test`・`npm run test:integration`・`npm run test:e2e` がすべて通ること。README の機能表の「管理画面」行にダッシュボードを追記する。
