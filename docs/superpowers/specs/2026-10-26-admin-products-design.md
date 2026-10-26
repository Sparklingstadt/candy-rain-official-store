# 管理画面 ③：商品の登録・編集 設計

- 作成日: 2026-10-26
- 状態: 実装済み
- 前提: [管理画面 ①](2026-10-25-admin-orders-design.md)・[管理画面 ②](2026-10-26-admin-inventory-design.md) が main に入っていること

## 背景と目的

管理画面の 4 つのサブプロジェクトのうち ③ として、管理者が商品とバリエーションを登録・編集し、ストアでの公開／非公開を切り替えられるようにする。

### 決定事項

- 画像はアップロードせず、同梱の画像（`public/products/candy/` の 15 枚）から選ぶ。管理者デモアカウントが公開されているため、任意の画像を公開できる経路を作らない。
- 「消す」操作は物理削除ではなく公開／非公開の切り替えとする。注文明細がバリエーションを参照しており、注文履歴を残すため。
- 公開／非公開は商品単位とバリエーション単位の両方で切り替える。
- 管理画面で新しく作る商品・バリエーションは非公開で作り、準備ができてから公開する。
- 公開デモで登録数が増え続けないよう、商品は合計 30 件、バリエーションは 1 商品あたり 10 件までとする。
- 既存バリエーションの価格・在庫の変更は ② の画面（`/admin/inventory`）に一本化する。③ では新規バリエーションの初期値だけを入力する。

### 対象外

- 画像のアップロード、外部画像 URL の入力
- 物理削除、変更履歴、一括インポート
- 公開日時の予約
- 商品情報の楽観ロック（後から保存した内容で上書きする。購入金額に関わらないため）
- ユーザー一覧（④で扱う）

## 1. データとストア側のルール

### スキーマ

- `Product.isPublished Boolean @default(true)` と `Variant.isPublished Boolean @default(true)` を追加する。マイグレーションを 1 本追加する。既存の行は公開のまま移行される。
- 管理画面からの作成時は `isPublished: false` を明示して作る。

### ストアに表示する条件

商品は「`Product.isPublished` が true」かつ「`isPublished` が true のバリエーションが 1 件以上ある」ときだけストアに表示する。この条件により「公開中の商品に買えるバリエーションがない」状態が起こらないため、公開操作のときに商品とバリエーションの相互チェックはしない。

- 商品一覧（`/products`）・トップページ：上の条件で絞り込む。各商品の `variants` も公開中のものだけを含める（一覧の価格表示・在庫表示が非公開バリエーションを含まないようにする）。
- 商品詳細（`/products/[id]`）：条件を満たさなければ `notFound()`。バリエーションは公開中のものだけを表示する。

### カートと購入

- カートへの追加（`CartItemRepository.addToCart`）：バリエーションまたは商品が非公開なら `{ error: "UNAVAILABLE" }` を返し、`cartService` は `CartError("UNAVAILABLE", "この商品は現在販売していません")` を投げる。
- 数量の増加（`incrementQuantityForUser`）：非公開なら 0 を返す（既存の「増やせない」扱い）。
- カート画面：`findManyWithVariantsByCartId` は `variant.product.isPublished` も含めて返す。非公開のものは行に「販売停止」バッジを表示し、数量を増やすボタンを無効にする。削除と数量を減らす操作はできる。
- 注文確定（`createOrderFromCart`）：在庫を減らす条件付き UPDATE の `where` に `isPublished: true, product: { isPublished: true }` を加える。更新できなかった行は、バリエーションを読み直して非公開なら `CheckoutError("UNAVAILABLE", "販売を停止した商品がカートに含まれています: {バリエーション名}")`、そうでなければ既存の `INSUFFICIENT_STOCK` を投げる。どちらもトランザクションをロールバックする。
- カード決済（`startPaidCheckout`）：与信の前に、カート内に非公開のものがあれば同じ `UNAVAILABLE` を投げる。与信後に非公開になった場合は、注文確定の失敗として既存どおり与信を取り消す。
- 注文履歴・注文詳細：購入時の名前と価格を保存しているため影響はない。

### 画像

- `lib/productImageCatalog.ts` に選択できる画像の一覧（`/products/candy/product-0.webp`〜`product-4.webp`、`variant-0.webp`〜`variant-9.webp` の 15 件、表示用のラベル付き）を定義する。Vercel では実行時に `public/` を一覧できないためコードに持つ。商品・バリエーションのどちらにも 15 件すべてを選べる。
- 保存時に、一覧にない URL は検証エラーにする。
- `lib/product-images.ts` の `getProductImageUrl` / `getVariantImageUrl` は、DB の URL が一覧にあればそれを使い、一覧にない（旧プレースホルダーの）ときだけ従来どおり対応表で置き換える。これにより管理画面で選んだ画像が表示に反映される。

### 登録数の上限

- 定数 `MAX_PRODUCTS = 30`、`MAX_VARIANTS_PER_PRODUCT = 10`。
- Service は件数を数えてから作成する。件数の確認と作成は 1 つのトランザクションで行うが、同時作成で 1〜2 件超えることは許容する（デモの容量対策のため、厳密さより単純さを優先する）。
- 上限値は Service の引数（既定値は上の定数）で受け取り、統合テストで小さい値に差し替えられるようにする。

## 2. 画面

### ナビゲーション

- `AdminHeader` のナビを「注文」「商品」（`/admin/products`）「在庫・価格」の 3 項目にする。390px 幅でも横スクロールなしで収める。

### `/admin/products`

- 見出し「商品」。`requireAdmin()` を呼ぶ（レイアウトに加えてページでも呼ぶ。①②と同じ）。
- 見出しの横に「商品を登録」ボタン（上限に達したら無効にし、理由を表示）と件数（例:「12 / 30 件」）。
- 表の列: 画像・商品名（編集ページへのリンク）・販売区分・状態・バリエーション（公開中の件数 / 全件数）。並び順は商品 ID 昇順。
- 状態バッジ: 「公開中」・「非公開」・「ストアに未表示」（商品は公開中だが公開中のバリエーションがない）。
- 商品が 0 件なら `EmptyState`。

### `/admin/products/new`

- 見出し「商品を登録」。商品フォーム（下記）とボタン「登録する」。
- 成功したら非公開で作成し、`/admin/products/{id}?created=1` へリダイレクトする。編集ページは `created=1` のとき「登録しました。バリエーションを追加して公開してください」を表示する。
- 上限に達している場合はエラーメッセージを表示する。

### 商品フォーム（登録・編集で共通）

| 項目 | 入力 | 検証 |
| --- | --- | --- |
| 商品名 | テキスト | 前後の空白を除いて 1〜50 文字 |
| 説明 | テキストエリア（任意） | 前後の空白を除いて 0〜1,000 文字（シードの商品は説明が空のため任意にする） |
| カテゴリ | テキスト（任意） | 前後の空白を除いて 0〜30 文字。空なら `null` |
| 販売区分 | セレクト（`salesTypeMeta` のラベル） | `salesTypes` のいずれか |
| 商品画像 | サムネイル付きラジオボタン（`fieldset` / `legend`） | 画像一覧にある URL |

- 全角英数字などは既存のプロフィール編集と同じく NFKC で正規化してから検証する。
- エラーは `FormActionState` で項目ごとに返し、入力値を保持して表示する（既存のプロフィール編集と同じ）。

### `/admin/products/[id]`

- 見出しは商品名。商品が存在しなければ `notFound()`（管理画面の `not-found.tsx`）。
- **公開状態**: 状態バッジと、「公開する」または「非公開にする」ボタン。公開中でも公開中のバリエーションがなければ「公開中のバリエーションがないため、ストアには表示されません」と表示する。
- **商品情報**: 商品フォームに現在の値を入れて表示し、ボタン「保存する」。
- **バリエーション**: 表の列は画像・名前・価格・在庫・状態・操作。操作は「編集」リンク（`/admin/products/{id}/variants/{variantId}`）と「公開する」/「非公開にする」ボタン。価格・在庫は表示のみで、表の上に「価格・在庫は在庫・価格の画面で変更します」と `/admin/inventory` へのリンクを置き、各行の価格・在庫は `/admin/inventory#variant-{variantId}` へのリンクにする。
- 「バリエーションを追加」ボタン（`/admin/products/{id}/variants/new`。上限に達したら無効）。バリエーションが 0 件なら `EmptyState`。

### `/admin/products/[id]/variants/new`

- 見出し「バリエーションを追加」と商品名。ボタン「追加する」。
- 項目: 名前（前後の空白を除いて 1〜30 文字）・価格（既存の `requirePrice`）・初期在庫（整数 0〜9,999）・画像（商品フォームと同じ選択 UI）。
- 成功したら非公開で作成し、商品の編集ページへリダイレクトする。

### `/admin/products/[id]/variants/[variantId]`

- 見出し「バリエーションを編集」。項目は名前と画像だけ。ボタン「保存する」。
- バリエーションが存在しない、または URL の商品のものでなければ `notFound()`。

### `/admin/inventory`（② の変更）

- 管理用の読み取りに切り替え、非公開の商品・バリエーションも表示する。非公開のものには「非公開」バッジを付ける。
- 各行に `id="variant-{variantId}"` を付ける。

### 結果メッセージ

- 公開設定・保存の結果は、各フォームの近くに表示する（成功は既存の成功表示、失敗は `role="alert"`）。

## 3. データの流れと各層の役割

### 入力検証（`lib/validation.ts`）

- 定数: `MAX_PRODUCT_NAME_LENGTH = 50`、`MAX_PRODUCT_DESCRIPTION_LENGTH = 1000`、`MAX_PRODUCT_CATEGORY_LENGTH = 30`、`MAX_VARIANT_NAME_LENGTH = 30`、`MAX_INITIAL_STOCK = 9999`。
- `parseProductInput(formData)` と `parseVariantInput(formData)` / `parseVariantUpdateInput(formData)` は、項目ごとのエラーと正規化後の値を返す（既存のプロフィール入力の検証と同じ形）。
- `requireInitialStock(value: unknown): number`（整数 0〜9,999）。
- `requireCatalogImageUrl(value: unknown): string`（画像一覧にある URL）。
- `requireSalesType(value: unknown): SalesType`。

### 読み取り

ストア用（既存メソッドの意味を変え、公開の条件で絞り込む）:

- `IProductRepository.findById(productId)` → ストアに表示する条件を満たす商品だけ返す（満たさなければ `null`）。
- `IProductRepository.findManyWithVariants(salesType?)` → 条件を満たす商品と、その公開中のバリエーション。
- `IVariantRepository.findManyByProductId(productId)` → 公開中のバリエーションだけ。

管理用（新設。すべてを返す）:

- `IProductRepository.findManyForAdmin()` → 全商品と全バリエーション（ID 昇順）。商品一覧と在庫・価格の画面で使う。
- `IProductRepository.findByIdForAdmin(productId)` → 商品と全バリエーション。
- `IProductRepository.count()`、`IVariantRepository.countByProductId(productId)`。
- `IVariantRepository.findByIdForAdmin(productId, variantId)` → 指定の商品のバリエーションだけ。

### 書き込み

- `IProductRepository.create(input)`（`isPublished: false`）、`update(productId, input): Promise<boolean>`、`setPublished(productId, published): Promise<boolean>`。
- `IVariantRepository.create(productId, input)`（`isPublished: false`）、`update(productId, variantId, input): Promise<boolean>`、`setPublished(productId, variantId, published): Promise<boolean>`。
- バリエーションの更新は `updateMany({ where: { id: variantId, productId } })` で行い、URL の商品と違う商品のバリエーションは書き換えない。戻り値は 1 件更新できたか。
- 公開設定は目標の値を書き込む（切り替えではない）。二重送信や同時操作でも結果が押したボタンどおりになる。同じ値への設定も成功とする。

### サービス（`services/admin/productAdminService.ts`、`server-only` は付けない＝統合テストから呼ぶため）

エラーは ①② と同じ形の `ProductAdminError`（`code` とメッセージ）。

| code | message |
| --- | --- |
| `PRODUCT_NOT_FOUND` | 商品が見つかりません |
| `VARIANT_NOT_FOUND` | バリエーションが見つかりません |
| `PRODUCT_LIMIT` | 登録できる商品は {N} 件までです |
| `VARIANT_LIMIT` | 1 つの商品に登録できるバリエーションは {N} 件までです |

- `createProduct(repo, input, limit = MAX_PRODUCTS): Promise<{ id: number }>`
- `updateProduct(repo, productId, input): Promise<void>`
- `setProductPublished(repo, productId, published): Promise<void>`
- `createVariant(productRepo, variantRepo, productId, input, limit = MAX_VARIANTS_PER_PRODUCT): Promise<{ id: number }>` — 商品がなければ `PRODUCT_NOT_FOUND`。
- `updateVariant(repo, productId, variantId, input): Promise<void>`
- `setVariantPublished(repo, productId, variantId, published): Promise<void>`

### Server Actions（`app/actions/admin/`）

① ② の管理用 Action と同じ順序。

1. `requireAdmin()`
2. ID は `requireNonNegativeInteger`、`published` は `"true"` / `"false"` だけを受け付ける。フォームの入力は上の `parse*Input`。ID・`published` の検証エラーは「入力内容を確認してください」。
3. サービスを呼ぶ。`ProductAdminError` はそのメッセージを返す。それ以外は `console.error` の後「処理に失敗しました。時間をおいてもう一度お試しください」。
4. 成功時もエラー時（`ProductAdminError`）も `revalidatePath("/admin", "layout")` と `revalidatePath("/", "layout")`。

| Action | 戻り値 | 成功時 |
| --- | --- | --- |
| `createProductAction` | `FormActionState` | `/admin/products/{id}?created=1` へ `redirect` |
| `updateProductAction` | `FormActionState` | 「商品情報を保存しました」 |
| `setProductPublishedAction` | `ActionResult<{ message }>` | 「公開しました」/「非公開にしました」 |
| `createVariantAction` | `FormActionState` | `/admin/products/{id}` へ `redirect` |
| `updateVariantAction` | `FormActionState` | 「バリエーションを保存しました」 |
| `setVariantPublishedAction` | `ActionResult<{ message }>` | 「公開しました」/「非公開にしました」 |

`redirect` は `try` / `catch` の外で呼ぶ（Next.js の `redirect` は例外で遷移するため）。

## 4. テスト

### 単体

- `lib/validation.test.mts`: 商品名・バリエーション名の境界値（0 文字・上限・上限 + 1・前後の空白・全角）、説明・カテゴリ（0 文字を受け付け、上限 + 1 を拒否）、初期在庫（`"0"`・`"9999"` を受け付け、`"-1"`・`"10000"`・`"1.5"`・`""` を拒否）、販売区分、画像 URL（一覧のものを受け付け、一覧外・`../` を含むもの・外部 URL を拒否）。
- `lib/product-images.test.mts`: DB の URL が一覧にあれば対応表より DB の URL を使う。一覧外なら従来どおり対応表で置き換える。

### DB 統合

`tests/integration/adminProducts.test.mts` を新設し `npm run test:integration` に追加する。テスト用データはファイル冒頭で作り、`after` で削除する（既存の商品 0〜4・バリエーション 0〜9 は使わない）。

- 作成した商品・バリエーションは非公開になる
- 商品・バリエーションの更新が反映される
- 別の商品のバリエーション ID を指定した更新・公開設定は `VARIANT_NOT_FOUND` で、何も変わらない
- 存在しない商品は `PRODUCT_NOT_FOUND`
- 公開設定は同じ値を 2 回送っても成功し、状態が変わらない
- 上限（テストで小さい値を渡す）に達すると `PRODUCT_LIMIT` / `VARIANT_LIMIT` で、作成されない
- ストア用の読み取りで、非公開の商品・公開中のバリエーションがない商品・非公開のバリエーションが返らない

`tests/integration/checkout.test.mts` に追加:

- 非公開のバリエーション、または非公開の商品がカートにあると注文確定は `UNAVAILABLE` で、在庫・注文・カートは変わらない
- 非公開のものはカートに追加できない（`UNAVAILABLE`）

`tests/integration/payment.test.mts` に追加:

- カード決済で非公開品があると与信の前に `UNAVAILABLE` になり、`fakeGateway` に与信が記録されない

### E2E（`e2e/admin.spec.ts` に追加。workers は 1 なので順に実行される）

- 顧客は `/admin/products` を開けない（`/products` へ移動）
- 管理者が商品を登録すると、非公開のためストアの一覧に出ない
- バリエーションを追加して商品・バリエーションを公開すると、ストアの一覧・詳細に出てカートに追加できる
- 商品を非公開にすると、ストアの詳細は 404、カートでは「販売停止」になり、注文確定でエラーが表示される
- 商品情報・バリエーション名・画像の変更がストアの表示に反映される
- 入力エラーは項目ごとに表示され、入力値が残る
- 390px 幅で管理ヘッダーが横にはみ出さない
- 既存のスナップショットに差分がないこと

E2E で作成した商品は fixture のティアダウンで削除する。加えて `prisma/reset-e2e.ts` は、シード以外の商品（ID 5 以上）とそのバリエーション・カート行・注文明細を削除する。公開デモの DB にはこのリセットを使わない（README に記載する）。

### 完了の条件

`npm run lint`・`npm run typecheck`・`npm test`・`npm run test:integration`・`npm run test:e2e` がすべて通ること。README の機能表の「管理画面」行に商品の登録・編集と公開設定を追記する。

## 実装時の変更点

- 項目ごとの入力検証は `lib/validation.ts` ではなく `lib/productValidation.ts` に置いた（プロフィールの検証と同じ形）。共通の補助関数は `lib/formParsing.ts` に移した。`lib/validation.ts` には `requirePublishedFlag` だけを追加した。
- 件数の確認と作成を 1 トランザクションにするため、Repository の作成メソッドは上限を受け取る `createWithinLimit`（上限に達していれば `null`）にした。`count()` / `countByProductId()` は使う箇所がないため作らなかった。
- 画像の選択肢のラベルは、商品画像を「{商品名}（商品画像）」、バリエーション画像をバリエーション名にした（ラジオボタンのアクセシブルネームが重複しないように）。登録フォームは画像を未選択の状態で始める。
- 商品・バリエーションが見つからないときは `app/admin/products/not-found.tsx`（「商品が見つかりません」）を表示する。
- カートでは非公開の商品名をリンクにしない（商品ページが 404 になるため）。
- E2E は `e2e/adminProducts.spec.ts` に置いた。390px 幅の確認は既存のテストに `/admin/products` を加えた。
