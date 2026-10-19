# Candy Rain Store

Candy Rain は「小さなときめきを、ひと箱に。」をコンセプトに、オリジナルグッズの商品選びから購入手続きまでを体験できる EC ストアのデモ Web アプリです。リポジトリ名は `prd-candy-rain-store` です。

**[デモを開く](https://candy-rain-store.vercel.app)** · [Shopify 連携ガイド](docs/shopify.md)

## 開発の目的

バックエンド開発の学習を目的に、画面だけでなく、認証・カート・在庫・注文データの整合性まで含めた購入フローを設計・実装しています。まず PostgreSQL を使って注文処理を自作し、次に同じストア UI を Shopify Storefront API と接続することで、自前で担う処理と外部サービスへ委ねる処理の境界を学ぶ構成にしています。

公開デモの接続先は Shopify の開発ストアです（2026-09-30 時点）。実販売用のストアではありません。テスト商品に加えて開発ストアのサンプル商品が含まれます。実販売への切り替え状況やテスト注文の確認記録は [連携ガイド](docs/shopify.md) を参照してください。

## 何ができるのか

環境変数 `COMMERCE_PROVIDER` で、二つの動作モードを切り替えます。

| 機能 | DB デモ（`demo` または未指定） | Shopify 連携（`shopify`） |
| --- | --- | --- |
| 商品一覧・詳細 | PostgreSQL の商品・バリエーションを表示 | Storefront API から取得し、一覧をページ送り |
| カート | サインインしたユーザーごとに DB へ保存 | ゲスト利用可能。カート ID を HttpOnly Cookie に保存 |
| 数量変更・削除 | 入力値・所有者・在庫を確認 | 数量と対象行を確認し、Shopify の応答・警告を表示 |
| 購入手続き | 在庫減算・注文作成・カート削除を一つのトランザクションで実行 | カートを再取得し Shopify Checkout へ遷移 |
| アカウント・注文履歴 | Auth.js のデモ認証、注文一覧・詳細 | Shopify のホスト型アカウント画面へ案内 |
| 決済・送料 | 実決済なし。デモ送料は 1,000 円 | Shopify Checkout が担当 |

DB デモのサインイン情報はサインイン画面に記載しています。Shopify モードでは旧デモの更新処理を停止し、二つの注文・カートデータが混在しないようにしています。

## 使用しているもの

| 技術 | 用途 |
| --- | --- |
| Next.js 16 / React 19 / TypeScript | App Router、Server Components、Server Actions による UI とサーバー処理 |
| Prisma ORM 7 / PostgreSQL | DB デモの商品・ユーザー・カート・注文の永続化とトランザクション |
| Auth.js 5 beta / bcryptjs | Credentials 認証とパスワードハッシュの照合 |
| Shopify Storefront API | 商品・カートの取得と更新、Checkout への接続 |
| Tailwind CSS 4 / shadcn/ui / Base UI / Lucide | レスポンシブ UI と共通コンポーネント |
| Node.js Test Runner / tsx / Playwright | 単体・DB 統合・ブラウザー E2E テスト |
| Docker Compose / GitHub Actions / Vercel | ローカル DB、継続的な品質確認、ホスティング |

具体的な依存バージョンは [package.json](package.json) と [package-lock.json](package-lock.json) を参照してください。

## どう設計したか

UI、入力を受け付ける Server Action、業務処理を担う Service、DB アクセスを担う Repository の責務を分けています。完全に抽象化しきるのではなく、処理のまとまりと整合性を優先し、段階的に整理しています。

```text
app/                         ページ・UI・Server Actions
  ↓ DB デモ                   ↓ Shopify 連携
services/                    lib/shopify/
  ↓                          ↓
repositories/                Storefront API → Shopify Checkout
  ↓
Prisma → PostgreSQL
```

DB デモのカート操作は Repository を通します。一方、注文確定は複数テーブルを一括更新するため、[checkoutService](services/checkout/checkoutService.ts) が Prisma のトランザクションを直接管理します。Shopify 連携は [lib/shopify](lib/shopify) に API 通信・商品取得・カート操作をまとめています。

## どう実装したか

- **注文と在庫の整合性**：DB デモでは在庫が注文数量以上の場合だけ減算します。在庫不足や注文作成の失敗時はトランザクションをロールバックし、途中の減算を残しません。注文には購入時のバリエーション名と価格を保存します。
- **入力・所有者の確認**：ID や数量、更新操作をサーバーで検証し、サインイン中のユーザーが所有するカート・注文を対象にします。数量は 1〜99 を受け付けます。
- **Shopify との接続**：価格・通貨・販売可否を API の応答に従って表示します。カート ID と private token をクライアントへ渡さず、API 失敗を空カートとして扱わないようにしています。
- **購入前の再確認**：Shopify Checkout へ進む直前にカートを取り直し、売り切れ・在庫不足・調整警告を表示します。決済と最終在庫確認は Shopify が担当します。
- **商品画像の一貫性**：[画像対応表](assets/candy-collection/shop-assets/image-mapping.json) を通して商品・バリエーションと素材を対応付けています。

## 学びと今後への活かし方

| 実装を通じて扱った課題 | 学び | 今後への活かし方 |
| --- | --- | --- |
| 在庫減算・注文作成・カート削除 | 一つずつ成功するだけでは購入処理全体の整合性を保証できない | 複数データの更新では、先にトランザクションの境界と失敗時の状態を設計する |
| UI と業務処理の分離 | 画面から業務ルールを分離すると、処理単位で検証しやすい | 機能追加でも Service と Repository の責務を見直し、変更範囲を限定する |
| Shopify への接続 | 外部 API の失敗・警告・状態変化も購入体験の一部になる | 外部連携では正常系と合わせて再取得、エラー表示、秘密情報の扱いを設計する |
| 単体・統合・E2E テスト | 計算、DB の整合性、画面操作では必要な検証の粒度が異なる | 変更対象に応じてテストを配置し、CI で回帰を検出する |

## ローカル開発

Node.js 24 と npm 11.6.2 を使用します（CI と同じ構成）。

```bash
git clone https://github.com/Sparklingstadt/prd-candy-rain-store.git
cd prd-candy-rain-store
npm ci
```

### DB デモを動かす

Docker Desktop を起動し、環境ファイルを用意します。

```bash
cp .env.example .env
openssl rand -base64 32
```

生成した値で `.env` の `AUTH_SECRET` を置き換えてから、次を実行します。

```bash
npm run db:setup
npm run dev
```

[localhost:3000](http://localhost:3000) を開きます。`db:setup` は設定確認、DB 起動、migration、seed を順に実行します。seed はデモユーザーのパスワード更新も含むため、学習用 DB を対象にしてください。

5432 番ポートが使用中の場合は `.env` の `POSTGRES_PORT` と `DATABASE_URL` のポートを両方とも空きポートに変更します。`npm run dev` は DB デモの場合、設定を確認し PostgreSQL コンテナを起動してから Next.js を起動します。

```bash
npm run db:start  # PostgreSQL を起動し healthcheck を待つ
npm run db:logs   # PostgreSQL のログを表示
npm run db:stop   # 停止する。データは volume に保持
```

### Shopify 連携を動かす

`.env.local` に接続先を設定します。接続先ストアで商品を対象の販売チャネルへ公開しておく必要があります。

```dotenv
COMMERCE_PROVIDER=shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
# Headless 販売チャネルを使う場合のみ設定するサーバー専用トークン
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=
```

```bash
npx prisma generate
npm run dev
```

このモードの起動には PostgreSQL と Docker は不要です。既存デモのモジュールも参照するため Prisma Client の生成は必要です。Admin API トークンは設定しないでください。詳細は [Shopify 連携ガイド](docs/shopify.md) を参照してください。

## 品質チェックとデプロイ

```bash
npm test                   # 単体テスト
npm run lint
npm run typecheck          # Prisma・Next.js の型生成も含む
npm run build
npm run test:integration   # DB 統合テスト（DB デモ）
npm run test:e2e           # ブラウザー E2E（DB デモ）
npm run test:shopify       # Storefront API を差し替えた E2E
```

DB 統合・E2E テストには migration と seed を適用した専用のローカル PostgreSQL を使用してください。`test:e2e` はデータをリセットするため、共有 DB や本番 DB を対象にしないでください。Playwright の初回実行前には `npx playwright install chromium` を実行します。Shopify E2E は本番ビルドを起動するので、先に `npm run build` が必要です。実ストアへの注文や決済は送信しません。

[GitHub Actions](.github/workflows/ci.yml) は main・dev への push、すべての Pull Request、手動実行を対象に次のチェックを実行します。

| ジョブ | 検証内容 |
| --- | --- |
| `verify` | 本番依存の npm audit（moderate 以上で失敗）、単体テスト、lint、Prisma・Next.js の型生成と TypeScript チェック、本番ビルド |
| `e2e` | 一時的な PostgreSQL 18 に schema 検証・migration・seed を適用し、DB 統合テストと DB デモの Playwright テスト |
| `shopify` | Shopify モードの本番ビルドと、モック Storefront API を使った Playwright テスト |
| `CI passed` | 上記3ジョブがすべて成功したことを確認（失敗・キャンセル・スキップは不合格） |

ブランチ保護の必須チェックには `CI passed` を指定できます（リポジトリ側で別途設定）。両 E2E ジョブの HTML レポートと失敗時の trace・スクリーンショットは、それぞれ `playwright-local` / `playwright-shopify` Artifact に7日間保存します。両モードで CI 中の `test.only` を禁止します。テストは一時 DB とモック API を使い、本番の認証情報を必要としません。

Actions はコミット SHA に固定し、Dependabot が毎週更新 PR を作成します。検証と migration の権限は `contents: read` に限定し、checkout 後に Git 認証情報を保持しません。新しいコミットが届いた場合は同じ PR の古い CI をキャンセルします。参考：[GitHub の安全な Actions 運用](https://docs.github.com/en/actions/reference/security/secure-use)、[Playwright の CI ガイド](https://playwright.dev/docs/ci)。

main への push では、3つの検証ジョブと `CI passed` の成功後に `release` ジョブが GitHub Release を自動作成します。PR・dev への push・手動実行では Release を作成しません。既存の最大の安定版タグ `vX.Y.Z` の patch を1つ増やし（例：`v0.9.0` → `v0.9.1`）、検証したコミット SHA にタグを付けてリリースノートを自動生成します。同じ SHA の公開済み Release は再利用し、タグだけ作成済みの場合はそのタグで再試行します。既存の draft/prerelease は上書きしません。Release のタグが検証済み SHA と一致することも確認します。

書き込み権限は `release` ジョブだけに付与し、リリース処理は直列化します。main の実行は新しい push で中断しません。Vercel デプロイは別途行い、本番 DB の migration は既存の手動ワークフローを使用します。

本番は [Vercel](https://candy-rain-store.vercel.app) で公開しています。通常のビルドは DB を更新しません。DB デモの migration は対象の `DATABASE_URL` を確認して `npm run db:migrate` を実行するか、[Migrate production database](.github/workflows/migrate-production.yml) を手動実行します。後者では GitHub の `production` Environment に `DATABASE_URL` secret を設定します。

ページ表示・商品操作・desktop/mobile の ARIA スナップショットの対象と更新手順は [E2E テストガイド](e2e/README.md) を参照してください。

## 今後の課題

- Service と Repository の責務を引き続き整理し、テスト対象を拡大する
- デモ用認証から実運用向けのアカウント運用へ進める際の要件を整理する
- Shopify の実販売用ストア・配送・決済設定を整える（現在は開発ストア）
- 独自マイページが必要になった場合に Customer Account API の導入を検討する

## キャンディーモチーフの商品素材

商品5件・Variant 10件のWebP画像は `public/products/candy/` に配置しています。
ランダム缶バッジはVariant 0のまま、5色の集合画像を使用します。

- 編集可能なBlenderモデル・個別PNG/WebP・元テクスチャ：`assets/candy-collection/`
- 素材一覧：`assets/candy-collection/index.html`（ブラウザーで直接開けます）
- 商品ID・Variant IDと画像URLの対応：`assets/candy-collection/shop-assets/image-mapping.json`
- 商品データとの照合記録：`assets/candy-collection/catalog-audit.md`

`prisma/seed.ts` は配置済みの画像URLを使用します。既存レコードについても、IDと商品名（VariantはproductIdも）が一致する場合に画像URLだけを更新します。この画像更新では価格・在庫・商品名を変更しません。
画像の配置だけでは既存DBのURLは変わりません。DBへ反映する場合は、接続先を確認して通常のseed手順を実行してください。seedには従来どおりデモユーザーのパスワード更新も含まれます。

商品一覧・詳細画面は `lib/product-images.ts` を通じて同じ対応表の画像を参照するため、DBに旧プレースホルダーURLが残っていても新しい画像を表示します。対応表にない商品・VariantはDBの画像URLを引き続き使用します。

Blenderモデル（`.blend`と番号付きバックアップ）は`.gitignore`で除外し、ローカルにのみ保持します。Git cloneで取得できるのはレンダリング画像・テクスチャ・生成スクリプト・対応表です。素材一覧のBlenderリンクはローカルにモデルがある場合に利用できます。
