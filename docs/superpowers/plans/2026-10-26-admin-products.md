# 管理画面 ③：商品の登録・編集 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者が商品とバリエーションを登録・編集し、商品単位・バリエーション単位で公開／非公開を切り替えられるようにする。非公開のものはストアに出ず、カートに入っていても購入できない。

**Architecture:** `Product.isPublished` / `Variant.isPublished` を追加し、ストア用の読み取り・カート操作・注文確定の条件付き UPDATE に公開の条件を加える。管理用の読み取りと書き込みは Repository に新設し、業務判定は `services/admin/productAdminService.ts`、画面は ①② の管理画面レイアウトの下に置く。

**Tech Stack:** Next.js 16（App Router・Server Actions）、React 19、Prisma 7 / PostgreSQL、Node.js Test Runner + tsx、Playwright

**Spec:** `docs/superpowers/specs/2026-10-26-admin-products-design.md`

## Global Constraints

- Next.js はこのリポジトリの版に破壊的変更がある。Next.js の API（`redirect`、`notFound`、`searchParams`、`params`）を使う前に `node_modules/next/dist/docs/` の該当ガイドを読む（AGENTS.md）。
- 層は `app/` → `services/` → `repositories/` → Prisma。管理用のページと Server Action はすべて先頭で `requireAdmin()` を呼ぶ。
- 上限: `MAX_PRODUCTS = 30`、`MAX_VARIANTS_PER_PRODUCT = 10`。文字数: 商品名 1〜50、説明 0〜1,000、カテゴリ 0〜30、バリエーション名 1〜30。価格 1〜9,999,999（既存 `requirePrice`）、初期在庫 0〜9,999。入力は NFKC で正規化し前後の空白を除く。
- エラーメッセージ: `PRODUCT_NOT_FOUND`「商品が見つかりません」、`VARIANT_NOT_FOUND`「バリエーションが見つかりません」、`PRODUCT_LIMIT`「登録できる商品は {N} 件までです」、`VARIANT_LIMIT`「1 つの商品に登録できるバリエーションは {N} 件までです」、カート追加「この商品は現在販売していません」、注文確定「販売を停止した商品がカートに含まれています: {バリエーション名}」、検証エラー「入力内容を確認してください」、想定外「処理に失敗しました。時間をおいてもう一度お試しください」。
- 成功メッセージ: 「商品情報を保存しました」「バリエーションを保存しました」「公開しました」「非公開にしました」、登録直後の編集ページ「登録しました。バリエーションを追加して公開してください」。
- 管理用 Action は成功時も `ProductAdminError` 時も `revalidatePath("/admin", "layout")` と `revalidatePath("/", "layout")`。`redirect` は `try` / `catch` の外で呼ぶ。
- 既存の管理用コード（`app/actions/admin/updatePriceAction.ts`、`app/admin/inventory/StockAdjustForm.tsx`、`services/admin/inventoryAdminService.ts`）とプロフィール編集（`app/actions/updateProfileAction.ts`、`app/(routes)/account/edit/ProfileForm.tsx`）の書き方に合わせる。フォームに再マウントを起こす `key` を付けない。
- 統合テストはファイルごとに並列実行される。既存の商品 0〜4・バリエーション 0〜9 の公開状態は統合テストで変えない（例外: `payment.test.mts` が専有するバリエーション 9 の `Variant.isPublished` だけは変えてよく、`beforeEach` で戻す）。
- 画面の文言・コミットメッセージは日本語。コミット末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける。

### 仕様からの変更点（実装上の整理）

- 項目ごとの入力検証（`parse*Input`）は `lib/validation.ts` ではなく、プロフィールの検証と同じ形の新ファイル `lib/productValidation.ts` に置く。共通の補助関数は `lib/accountValidation.ts` から `lib/formParsing.ts` に移して両方から使う。`requireInitialStock` などは独立した関数にせず、`parse*Input` の中の項目チェックにする。`lib/validation.ts` には `requirePublishedFlag` だけを足す。
- 件数の確認と作成を 1 トランザクションにするため、Repository の作成メソッドは上限を受け取る `createWithinLimit`（上限に達していれば `null`）にする。
- E2E は `e2e/admin.spec.ts` に足さず、新ファイル `e2e/adminProducts.spec.ts` に置く（既存ファイルが長いため）。390px のヘッダーの確認は既存のテストがそのまま担う。
- 動的ルートのパラメーター名は既存の `[orderId]` に合わせて `[productId]` / `[variantId]` にする。

## Review Focus

1. **説明の改行**：テキストエリアの改行は受け付ける（既存の `textError` は制御文字を拒否するため、説明だけ `\n` を許し `\r\n` を `\n` にそろえる）→ Task 2 の単体テスト。
2. **説明が空のシード商品を編集して保存**：エラーにならない → Task 2 の単体テスト。
3. **全角数字の価格・在庫**（`"１２００"`、`"１０"`）：NFKC で受け付ける → Task 2 の単体テスト。
4. **公開中の商品で最後の公開バリエーションを非公開にする**：ストアから消え、管理画面では「ストアに未表示」→ Task 3 の統合テストと Task 6 の単体テスト。
5. **3D セキュア認証中に商品が非公開になる**：注文を作らず与信を取り消す → Task 4 の統合テスト。

---

## File Structure

| ファイル | 役割 |
| --- | --- |
| `lib/productImageCatalog.ts` | 選択できる画像 15 件と `isCatalogImageUrl` |
| `lib/product-images.ts` | DB の URL が一覧にあれば優先する |
| `lib/formParsing.ts` | `readText`・`textError`・`toResult`・`ParseResult`（`accountValidation.ts` から移す） |
| `lib/productValidation.ts` | 商品・バリエーションの項目ごとの検証と定数 |
| `lib/validation.ts` | `requirePublishedFlag` を追加 |
| `lib/availability.ts` | `isOnSale`（バリエーションと商品がどちらも公開中か） |
| `lib/productStatus.ts` | 管理画面の状態バッジ（公開中・非公開・ストアに未表示） |
| `prisma/schema.prisma`、`prisma/migrations/*_add_is_published/` | `isPublished` 列 |
| `repositories/entities/Product.ts` | `ProductForAdmin` / `VariantForAdmin` 型 |
| `repositories/interfaces/I{Product,Variant,CartItem}Repository.ts`、`repositories/implementations/*` | ストア用の絞り込み、管理用の読み書き、カートの公開確認 |
| `services/cartService.ts`、`services/checkout/checkoutService.ts` | `UNAVAILABLE` |
| `services/admin/productAdminService.ts` | `ProductAdminError` と管理用の操作 |
| `app/actions/admin/*Action.ts`（6 本） | Server Actions |
| `app/admin/products/**` | 一覧・登録・編集・バリエーションの追加と編集の画面 |
| `app/admin/components/AdminHeader.tsx`、`app/admin/inventory/page.tsx` | ナビと②の画面の変更 |
| `app/(routes)/cart/*` | 「販売停止」の表示 |
| `e2e/adminProducts.spec.ts`、`e2e/fixtures/store.ts`、`prisma/reset-e2e.ts` | E2E と後始末 |

---

### Task 1: 画像の一覧と表示の優先順位

**Files:**
- Create: `lib/productImageCatalog.ts`
- Modify: `lib/product-images.ts`
- Test: `lib/product-images.test.mts`

**Interfaces:**
- Produces: `productImageCatalog: readonly { url: string, label: string }[]`（商品画像 5 件 → バリエーション画像 10 件の順）、`isCatalogImageUrl(url: string): boolean`

- [ ] **Step 1: テストを追加**

```ts
test("一覧にある DB の URL は対応表より優先する", () => {
  const product = mapping.products[0]
  assert.equal(getProductImageUrl({ ...product, thumbnailImageUrl: "/products/candy/product-3.webp" }), "/products/candy/product-3.webp")
  const variant = mapping.variants[0]
  assert.equal(getVariantImageUrl({ ...variant, imageUrl: "/products/candy/variant-5.webp" }), "/products/candy/variant-5.webp")
})

test("画像の一覧は 15 件で、すべて public に存在する", () => {
  assert.equal(productImageCatalog.length, 15)
  for (const image of productImageCatalog) assert.ok(existsSync(new URL("../public" + image.url, import.meta.url)))
  assert.equal(isCatalogImageUrl("/products/candy/../candy/product-0.webp"), false)
  assert.equal(isCatalogImageUrl("https://example.com/product-0.webp"), false)
})
```

既存の 2 つのテスト（旧 URL は対応表で置き換える・無関係な商品は自分の URL）はそのまま通ること。

- [ ] **Step 2: 失敗を確認** — `npx tsx --test lib/product-images.test.mts` → FAIL（`productImageCatalog` が未定義）
- [ ] **Step 3: 実装** — 一覧の URL とラベルは `assets/candy-collection/shop-assets/image-mapping.json` から作る（ラベルは商品なら商品名、バリエーションなら「商品名 / バリエーション名」）。`isCatalogImageUrl` は完全一致。`getProductImageUrl` / `getVariantImageUrl` は DB の URL が一覧にあればそれを返し、なければ従来の対応表の検索。
- [ ] **Step 4: 通過を確認** — 同じコマンドで PASS
- [ ] **Step 5: コミット** — `feat: 選択できる商品画像の一覧を追加し、DB の画像を優先する`

### Task 2: 商品・バリエーションの入力検証

**Files:**
- Create: `lib/formParsing.ts`、`lib/productValidation.ts`、`lib/productValidation.test.mts`
- Modify: `lib/accountValidation.ts`（補助関数を `formParsing.ts` から import。`ParseResult` 型は re-export して既存の import を壊さない）、`lib/validation.ts`、`lib/validation.test.mts`、`package.json`（`npm test` に `lib/productValidation.test.mts` を追加）

**Interfaces:**
- Consumes: `isCatalogImageUrl`（Task 1）、`requirePrice`、`salesTypes`
- Produces:
  - 定数 `MAX_PRODUCT_NAME_LENGTH = 50`、`MAX_PRODUCT_DESCRIPTION_LENGTH = 1000`、`MAX_PRODUCT_CATEGORY_LENGTH = 30`、`MAX_VARIANT_NAME_LENGTH = 30`、`MAX_INITIAL_STOCK = 9999`
  - `type ProductInput = { name: string, description: string, category: string | null, salesType: SalesType, thumbnailImageUrl: string }`、`type ProductField = keyof ProductInput`
  - `type VariantInput = { name: string, price: number, stock: number, imageUrl: string }`、`type VariantField = keyof VariantInput`
  - `type VariantUpdateInput = { name: string, imageUrl: string }`、`type VariantUpdateField = keyof VariantUpdateInput`
  - `parseProductInput(form): ParseResult<ProductField, ProductInput>`、`parseVariantInput(form): ParseResult<VariantField, VariantInput>`、`parseVariantUpdateInput(form): ParseResult<VariantUpdateField, VariantUpdateInput>`（フォームの項目名は型のキーと同じ）
  - `productFormValues(form): Record<ProductField, string>`、`variantFormValues(form): Record<VariantField, string>`、`variantUpdateFormValues(form): Record<VariantUpdateField, string>`（Service のエラー時に入力値を返すため。`parse*` と同じ正規化）
  - `requirePublishedFlag(value: unknown): boolean`（`"true"` → true、`"false"` → false、それ以外は `Error`）

- [ ] **Step 1: テストを書く**（`lib/productValidation.test.mts`。`FormData` を作って渡す）

```ts
test("商品の入力を正規化して受け付ける", () => {
  const result = parseProductInput(form({ name: " ＡＢＣ缶 ", description: "1行目\r\n2行目", category: "", salesType: "PERMANENT", thumbnailImageUrl: "/products/candy/product-0.webp" }))
  assert.deepEqual(result, { success: true, data: { name: "ABC缶", description: "1行目\n2行目", category: null, salesType: "PERMANENT", thumbnailImageUrl: "/products/candy/product-0.webp" } })
})
test("説明が空でも受け付ける", ...)                       // success: true, description: ""
test("商品名は 50 文字まで", ...)                         // 50 文字 OK、51 文字は fieldErrors.name「商品名は50文字以内で入力してください」、"" は「商品名を入力してください」
test("説明は 1,000 文字、カテゴリは 30 文字まで", ...)     // 上限 + 1 で各 fieldErrors
test("販売区分と画像は既知の値だけ", ...)                  // salesType "OTHER" →「販売区分を選択してください」、画像 "/x.png" →「画像を選択してください」。values は入力のまま
test("バリエーションの価格と初期在庫は全角数字も受け付ける", ...) // price "１２００" → 1200、stock "１０" → 10
test("初期在庫は 0〜9,999 の整数", ...)                    // "0"・"9999" OK、"-1"・"10000"・"1.5"・"" は「在庫は0〜9,999の整数で入力してください」
test("価格は 1〜9,999,999 の整数", ...)                    // "0" は「価格は1〜9,999,999の整数で入力してください」
test("バリエーション名は 30 文字まで、更新は名前と画像だけを検証する", ...)
```

`lib/validation.test.mts` に `requirePublishedFlag`（`"true"`・`"false"` を受け付け、`"on"`・`""`・`null` を拒否）を追加。

- [ ] **Step 2: 失敗を確認** — `npx tsx --test lib/productValidation.test.mts lib/validation.test.mts lib/accountValidation.test.mts` → 新しいテストが FAIL
- [ ] **Step 3: 実装** — 説明だけは `textError` を使わず、改行（`\n`）以外の制御文字を拒否する独自チェックにする。価格は `requirePrice` を `try` で呼んで項目エラーに変換する。
- [ ] **Step 4: 通過を確認** — 同じコマンドで PASS（`accountValidation` の既存テストも PASS）
- [ ] **Step 5: コミット** — `feat: 商品とバリエーションの入力検証を追加`

### Task 3: 公開状態の列と、ストア・カートでの絞り込み

**Files:**
- Modify: `prisma/schema.prisma`、`repositories/implementations/{productRepository,variantRepository,cartItemRepository}.ts`、`repositories/interfaces/ICartItemRepository.ts`、`services/cartService.ts`、`lib/types.ts`、`app/(routes)/cart/CartItemRow.tsx`（とその行を描く `CartItemTable.tsx`）、`package.json`（`test:integration` に `tests/integration/adminProducts.test.mts`）
- Create: マイグレーション（`npx prisma migrate dev --name add_is_published`）、`lib/availability.ts`、`tests/integration/adminProducts.test.mts`
- Test: `tests/integration/adminProducts.test.mts`、`tests/integration/checkout.test.mts`

**Interfaces:**
- Produces:
  - `isOnSale(variant: { isPublished: boolean, product: { isPublished: boolean } }): boolean`
  - `lib/types.ts`: `Product` と `Variant` に `isPublished: boolean`。`CartItemWithVariant.variant` は `Variant & { product: { isPublished: boolean } }`
  - `AddToCartResult` の error に `"UNAVAILABLE"`、`CartErrorCode` に `"UNAVAILABLE"`
  - ストア用の `findById` / `findManyWithVariants` / `findManyByProductId` は公開の条件で絞り込む（意味の変更。シグネチャは同じ）

- [ ] **Step 1: スキーマとマイグレーション** — 両モデルに `isPublished Boolean @default(true)`。`npx prisma migrate dev --name add_is_published` を実行し、生成された SQL が `ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true` の 2 文だけであることを確認する。
- [ ] **Step 2: 統合テストを書く** — `tests/integration/adminProducts.test.mts` を新設。`before` で名前が `admin-products-${Date.now()}` で始まる商品を Prisma で直接作り、`after` でその名前の商品のカート行・バリエーション・商品を消す。

```ts
test("ストア用の読み取りは非公開の商品と、公開中のバリエーションがない商品を返さない", ...)
  // 公開商品 A（公開 V1・非公開 V2）、非公開商品 B（公開 V3）、公開商品 C（非公開 V4 だけ）を作る
  // findManyWithVariants() の結果に A があり V2 を含まない。B・C はない
  // findById(A) は A、findById(B)・findById(C) は null。findManyByProductId(A) は [V1]
test("最後の公開バリエーションを非公開にすると商品がストアから消える", ...) // A の V1 を非公開にすると findById(A) が null
```

`tests/integration/checkout.test.mts` に、専用の公開商品とバリエーションを `before` で作って:

```ts
test("非公開のものはカートに追加できない", ...)     // variant 非公開 → addItemToCart rejects { code: "UNAVAILABLE", message: "この商品は現在販売していません" }。商品非公開でも同じ
test("非公開のものは数量を増やせない", ...)         // カートに入れた後で非公開 → updateCartItemQuantity(..., "increment") rejects { code: "QUANTITY_UNAVAILABLE" }
```

- [ ] **Step 3: 失敗を確認** — `npx tsx --test tests/integration/adminProducts.test.mts tests/integration/checkout.test.mts` → 新しいテストが FAIL
- [ ] **Step 4: 実装** — ストアの条件は `{ isPublished: true, variants: { some: { isPublished: true } } }`。`findById` は `findFirst`、`findManyWithVariants` の `include.variants` に `where: { isPublished: true }`。`addToCart` はバリエーションを `include: { product: { select: { isPublished: true } } }` で読み、存在しなければ従来どおり `OUT_OF_STOCK`、`!isOnSale` なら `UNAVAILABLE`。`incrementQuantityForUser` も `!isOnSale` なら 0。`findManyWithVariantsByCartId` は `variant.product.isPublished` を含める。カートの行は `!isOnSale` のとき「販売停止」バッジを出し、増やすボタンを無効にする。
- [ ] **Step 5: 通過を確認** — 同じコマンドと `npm run typecheck`・`npm test` が PASS
- [ ] **Step 6: コミット** — `feat: 商品とバリエーションに公開状態を追加し、ストアとカートで非公開を除く`

### Task 4: 注文確定とカード決済での公開確認

**Files:**
- Modify: `services/checkout/checkoutService.ts`
- Test: `tests/integration/checkout.test.mts`、`tests/integration/payment.test.mts`

**Interfaces:**
- Consumes: `isOnSale`（Task 3）
- Produces: `CheckoutErrorCode` に `"UNAVAILABLE"`

- [ ] **Step 1: テストを書く**

`checkout.test.mts`（Task 3 の専用商品を使う）:

```ts
test("非公開のバリエーションがカートにあると注文確定は UNAVAILABLE で、在庫・注文・カートは変わらない", ...)
  // ユーザー 0 のカートにバリエーション 0（2 個）と専用バリエーション（1 個）→ 専用バリエーションを非公開
  // rejects { code: "UNAVAILABLE", message: "販売を停止した商品がカートに含まれています: {専用バリエーション名}" }
  // バリエーション 0 の在庫 50 のまま、注文 0 件、カート行 2 件のまま
test("非公開の商品がカートにあると注文確定は UNAVAILABLE", ...)
```

`payment.test.mts`（`beforeEach` のバリエーション 9 の更新に `isPublished: true` を加える）:

```ts
test("非公開品があるとカード決済は与信の前に UNAVAILABLE になる", ...)
  // バリエーション 9 を非公開 → startPaidCheckout rejects { code: "UNAVAILABLE" }、gateway.calls は []
test("3D セキュア認証中に非公開になったら注文を作らず与信を取り消す", ...)
  // authorizeStatus = "requires_action" で startPaidCheckout → バリエーション 9 を非公開 → retrieve が authorized を返す状態にして completePaidCheckout
  // rejects { code: "UNAVAILABLE" }、gateway.calls に `cancel:{id}` を含み capture を含まない、注文 0 件
```

- [ ] **Step 2: 失敗を確認** — `npx tsx --test tests/integration/checkout.test.mts tests/integration/payment.test.mts` → FAIL
- [ ] **Step 3: 実装** — 在庫減算の `where` に `isPublished: true, product: { isPublished: true }`。更新できなかった行はバリエーションを商品の `isPublished` 付きで読み直し、なければまたは `!isOnSale` なら `UNAVAILABLE`、それ以外は従来の `INSUFFICIENT_STOCK`。`calculateCartTotal` もバリエーションの商品を含めて読み、`!isOnSale` の行があれば与信の前に同じ `UNAVAILABLE` を投げる。`placeOrderAction` / `completeOrderAction` が `CheckoutError` のメッセージを画面に返すことを確認する（追加の変更は不要のはず）。
- [ ] **Step 4: 通過を確認** — 同じコマンドで PASS
- [ ] **Step 5: コミット** — `feat: 販売を停止した商品を含む注文を確定しない`

### Task 5: 管理用の Repository とサービス

**Files:**
- Create: `services/admin/productAdminService.ts`
- Modify: `repositories/entities/Product.ts`、`repositories/interfaces/IProductRepository.ts`、`repositories/interfaces/IVariantRepository.ts`、`repositories/implementations/productRepository.ts`、`repositories/implementations/variantRepository.ts`
- Test: `tests/integration/adminProducts.test.mts`

**Interfaces:**
- Consumes: `ProductInput` / `VariantInput` / `VariantUpdateInput`（Task 2）
- Produces:
  - `type VariantForAdmin = Variant & { isPublished: boolean }`、`type ProductForAdmin = Product & { isPublished: boolean, variants: VariantForAdmin[] }`
  - `IProductRepository`: `findManyForAdmin(): Promise<ProductForAdmin[]>`（ID 昇順、バリエーションも ID 昇順）、`findByIdForAdmin(productId: number): Promise<ProductForAdmin | null>`、`count(): Promise<number>`、`createWithinLimit(input: ProductInput, limit: number): Promise<{ id: number } | null>`、`update(productId: number, input: ProductInput): Promise<boolean>`、`setPublished(productId: number, published: boolean): Promise<boolean>`
  - `IVariantRepository`: `findByIdForAdmin(productId: number, variantId: number): Promise<VariantForAdmin | null>`、`countByProductId(productId: number): Promise<number>`、`createWithinLimit(productId: number, input: VariantInput, limit: number): Promise<{ id: number } | null>`、`update(productId: number, variantId: number, input: VariantUpdateInput): Promise<boolean>`、`setPublished(productId: number, variantId: number, published: boolean): Promise<boolean>`
  - `productAdminService`: `ProductAdminError`（`code: ProductAdminErrorCode`）、`MAX_PRODUCTS`、`MAX_VARIANTS_PER_PRODUCT`、`listProductsForAdmin(repo)`、`getProductForAdmin(repo, productId)`（なければ `null`）、`getVariantForAdmin(repo, productId, variantId)`（なければ `null`）、`createProduct(repo, input, limit = MAX_PRODUCTS): Promise<{ id: number }>`、`updateProduct(repo, productId, input): Promise<void>`、`setProductPublished(repo, productId, published): Promise<void>`、`createVariant(productRepo, variantRepo, productId, input, limit = MAX_VARIANTS_PER_PRODUCT): Promise<{ id: number }>`、`updateVariant(repo, productId, variantId, input): Promise<void>`、`setVariantPublished(repo, productId, variantId, published): Promise<void>`

- [ ] **Step 1: テストを追加**（Task 3 のファイルに追加）

```ts
test("作成した商品とバリエーションは非公開になる", ...)
test("商品とバリエーションの更新が反映される", ...)
test("別の商品のバリエーションは更新も公開設定もできない", ...)  // rejects { code: "VARIANT_NOT_FOUND" }、名前・画像・isPublished は変わらない
test("存在しない商品は PRODUCT_NOT_FOUND", ...)               // updateProduct・setProductPublished・createVariant(999_999)
test("公開設定は同じ値を 2 回送っても成功し、状態が変わらない", ...)
test("上限に達すると作成しない", ...)
  // createProduct(repo, input, 1) は rejects { code: "PRODUCT_LIMIT", message: "登録できる商品は 1 件までです" }（シードの 5 件があるため常に上限）。count() は変わらない
  // バリエーション 2 件の商品に createVariant(..., 2) は rejects { code: "VARIANT_LIMIT", message: "1 つの商品に登録できるバリエーションは 2 件までです" }
```

- [ ] **Step 2: 失敗を確認** — `npx tsx --test tests/integration/adminProducts.test.mts` → FAIL
- [ ] **Step 3: 実装** — `createWithinLimit` は `prisma.$transaction` の中で件数を数えて作成する（`isPublished: false` を明示）。バリエーションの `update` / `setPublished` は `updateMany({ where: { id: variantId, productId } })` で 1 件更新できたかを返す。サービスは `false` / `null` を対応するエラーコードに変換する。`createVariant` は先に `findByIdForAdmin` で商品の存在を確かめる。`server-only` は付けない。
- [ ] **Step 4: 通過を確認** — 同じコマンドと `npm run test:integration` が PASS
- [ ] **Step 5: コミット** — `feat: 商品とバリエーションの管理用の操作を追加`

### Task 6: 商品の一覧・登録・編集の画面と Server Actions

**Files:**
- Create: `lib/productStatus.ts`、`lib/productStatus.test.mts`、`app/actions/admin/{createProductAction,updateProductAction,setProductPublishedAction,createVariantAction,updateVariantAction,setVariantPublishedAction}.ts`、`app/admin/products/page.tsx`、`app/admin/products/new/page.tsx`、`app/admin/products/[productId]/page.tsx`、`app/admin/products/components/{ProductForm,ImagePicker,PublishForm,ProductStatusBadge}.tsx`
- Modify: `app/admin/components/AdminHeader.tsx`、`app/admin/inventory/page.tsx`、`package.json`（`npm test` に `lib/productStatus.test.mts`）

**Interfaces:**
- Consumes: Task 2 の `parse*` / `*FormValues` / `requirePublishedFlag`、Task 5 のサービス、Task 1 の `productImageCatalog`
- Produces:
  - `storeStatusOf(product: { isPublished: boolean, variants: { isPublished: boolean }[] }): "PUBLISHED" | "UNPUBLISHED" | "NOT_LISTED"`、`storeStatusLabel`（「公開中」「非公開」「ストアに未表示」）
  - Actions はすべて `(prevState: unknown, formData: FormData)`。ID は hidden の `productId` / `variantId`、公開設定は hidden の `published`（`"true"` / `"false"`）。戻り値は仕様の表どおり（`FormActionState<ProductField | VariantField | VariantUpdateField>` / `ActionResult<{ message: string }>`）。`ProductAdminError` 時の `FormActionState` は `fieldErrors: {}` と `*FormValues(formData)`。
  - `ImagePicker({ name, legend, selected, error })`：`productImageCatalog` のサムネイル付きラジオ。各ラジオのアクセシブルネームはラベル文字列。
  - `PublishForm({ action, hiddenFields, published, targetName })`：ボタンは「公開する」/「非公開にする」、`aria-label` は「{targetName}を公開する」/「{targetName}を非公開にする」。
  - 6 つの Action はこのタスクで全部作る（バリエーション用は Task 7 の画面が使う）

- [ ] **Step 1: `storeStatusOf` の単体テストを書く** — 非公開の商品は `UNPUBLISHED`（バリエーションに関係なく）、公開中で公開バリエーション 0 件（バリエーション 0 件を含む）は `NOT_LISTED`、1 件以上は `PUBLISHED`。
- [ ] **Step 2: 失敗を確認し、実装して通過を確認** — `npx tsx --test lib/productStatus.test.mts`
- [ ] **Step 3: Server Actions を実装** — 順序は Global Constraints と `updatePriceAction.ts` どおり。`createProductAction` は成功後 `redirect(\`/admin/products/${id}?created=1\`)`、`createVariantAction` は `redirect(\`/admin/products/${productId}\`)`。
- [ ] **Step 4: 画面を実装** — 仕様の「2. 画面」の `/admin/products`・`/admin/products/new`・`/admin/products/[productId]`（公開状態・商品情報・バリエーションの表。バリエーションの「編集」リンクと公開ボタン、「バリエーションを追加」ボタンもここで置く）。存在しない・不正な `productId` は `notFound()`。ナビに「商品」を「注文」と「在庫・価格」の間に追加。`/admin/inventory` は `listProductsForAdmin` に切り替え、非公開には「非公開」バッジ、各行に `id="variant-{id}"`。
- [ ] **Step 5: 確認** — `npm run lint`・`npm run typecheck`・`npm test` が PASS。`npm run dev` で管理者としてサインインし、商品を登録 → 編集ページに「登録しました…」→ 商品情報を保存 → 公開ボタンの表示を確認する。
- [ ] **Step 6: コミット** — `feat: 管理画面に商品の一覧・登録・編集を追加`

### Task 7: バリエーションの追加・編集の画面

**Files:**
- Create: `app/admin/products/[productId]/variants/new/page.tsx`、`app/admin/products/[productId]/variants/[variantId]/page.tsx`、`app/admin/products/components/VariantForm.tsx`

**Interfaces:**
- Consumes: `createVariantAction` / `updateVariantAction`（Task 6）、`ImagePicker`、`getProductForAdmin` / `getVariantForAdmin`（Task 5）
- Produces: `VariantForm({ mode: "create" | "edit", productId, variantId?, initial })`。`create` は名前・価格・初期在庫・画像、`edit` は名前・画像だけ。

- [ ] **Step 1: 実装** — 見出しは「バリエーションを追加」/「バリエーションを編集」と商品名。追加は上限に達していたらフォームの代わりに `VARIANT_LIMIT` のメッセージを出す。編集ページは `getVariantForAdmin(repo, productId, variantId)` が `null` なら `notFound()`（別の商品のバリエーション ID を含む）。保存結果は `FormMessage`。
- [ ] **Step 2: 確認** — `npm run lint`・`npm run typecheck`。`npm run dev` でバリエーションを追加 → 編集ページへ戻る → 名前と画像を変更 → 商品と一緒に公開してストアに出ることを確認する。`/admin/products/0/variants/9` が 404 になることを確認する。
- [ ] **Step 3: コミット** — `feat: 管理画面にバリエーションの追加・編集を追加`

### Task 8: E2E・後始末・README

**Files:**
- Create: `e2e/adminProducts.spec.ts`
- Modify: `e2e/fixtures/store.ts`、`prisma/reset-e2e.ts`、`README.md`、`docs/superpowers/specs/2026-10-26-admin-products-design.md`（状態を「実装済み」にし、「仕様からの変更点」を追記）

**Interfaces:**
- Produces: fixture `e2eProduct: { name: string }` — `E2E-{uuid の先頭 8 文字}` の一意な名前を渡し、ティアダウンで名前がその接頭辞で始まる商品の注文明細・カート行・バリエーション・商品を消す（`database` に依存させ、プールより先に後始末する）

- [ ] **Step 1: テストを書く**（`e2e/adminProducts.spec.ts`）

```ts
test("顧客は商品の管理画面を開けない", ...)                     // /admin/products → /products
test("登録した商品は非公開でストアに出ず、公開するとストアで購入できる", ...)
  // 管理者: 登録 → 「登録しました…」→ ストア（別コンテキストの顧客）の一覧に e2eProduct.name がない
  // バリエーション追加（価格 1200、在庫 5）→ 商品とバリエーションを公開 → 顧客の一覧・詳細に出て「カートに追加」できる
test("商品を非公開にすると詳細は 404、カートは「販売停止」になり注文確定でエラーになる", ...)
test("商品情報・バリエーション名・画像の変更がストアに反映される", ...)
test("入力エラーは項目ごとに表示され、入力値が残る", ...)           // 商品名 51 文字・画像未選択で送信
```

- [ ] **Step 2: 後始末を実装** — fixture を追加。`prisma/reset-e2e.ts` に、商品 ID 5 以上のカート行・バリエーション・商品の削除を加える（注文明細は既存の処理で全削除済み）。
- [ ] **Step 3: 通過を確認** — `npm run test:e2e` が PASS（既存の `admin.spec.ts` の 390px テスト・スナップショットも差分なし）
- [ ] **Step 4: README と仕様** — 機能表の「管理画面」行に「商品・バリエーションの登録・編集と公開／非公開の切り替え」を追記。「品質チェック」節の `test:e2e` の注意に「シード以外の商品（ID 5 以上）も削除する」を加える。
- [ ] **Step 5: 最終確認** — `npm run lint`・`npm run typecheck`・`npm test`・`npm run build`・`npm run test:integration`・`npm run test:e2e` がすべて PASS
- [ ] **Step 6: コミット** — `test: 商品の登録・公開の E2E を追加し、README を更新`
