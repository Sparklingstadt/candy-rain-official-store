# Candy Rain Official Store

Candy Rain は「小さなときめきを、ひと箱に。」をコンセプトに、オリジナルグッズの商品選びから購入手続きまでを体験できる EC ストアのデモ Web アプリです。リポジトリ名は `candy-rain-official-store` です。

**[デモを開く](https://candy-rain-official-store.vercel.app)**

## 開発の目的

バックエンド開発の学習を目的に、画面だけでなく、認証・カート・在庫・注文データの整合性まで含めた購入フローを設計・実装しています。PostgreSQL を使い、注文処理を自作しています。

## 何ができるのか

| 機能 | 内容 |
| --- | --- |
| 商品一覧・詳細 | PostgreSQL の商品・バリエーションを表示。販売区分で絞り込み |
| カート | サインインしたユーザーごとに DB へ保存 |
| 数量変更・削除 | 入力値・所有者・在庫を確認 |
| 購入手続き | 在庫減算・注文作成・カート削除を一つのトランザクションで実行 |
| アカウント・注文履歴 | [Candy Rain ID](https://github.com/Sparklingstadt/candy-rain-identity-server)（Go 製の OpenID Connect 認証サーバー）経由のサインイン、氏名・お届け先の編集、注文一覧・詳細 |
| 決済・送料 | Stripe のテストモードでカードを登録・選択して決済（キー未設定時は決済なし）。デモ送料は 1,000 円 |
| 管理画面 | 管理者のみ。ダッシュボード（対応待ち・今日と今月の売上・最新の注文・商品の状態）、全注文の一覧・絞り込み、発送ステータスの変更、キャンセル時の在庫戻しと Stripe 返金、在庫の増減・価格の変更、商品・バリエーションの登録・編集と公開／非公開の切り替え（商品一覧はカード表示とリスト表示を切り替えられる）（非公開のものはストアに表示されず、カートにあっても購入できない） |

デモ顧客のサインイン情報はサインイン画面に記載しています。入力は Candy Rain ID の画面で行います。管理者アカウント（`admin@mail.com`）は公開しておらず、`SEED_ADMIN_PASSWORD` を設定して seed したときだけ、そのパスワードで作成されます。

## 使用しているもの

| 技術 | 用途 |
| --- | --- |
| Next.js 16 / React 19 / TypeScript | App Router、Server Components、Server Actions による UI とサーバー処理 |
| Prisma ORM 7 / PostgreSQL | 商品・ユーザー・カート・注文の永続化とトランザクション |
| Auth.js 5 beta / [Candy Rain ID](https://github.com/Sparklingstadt/candy-rain-identity-server) | OpenID Connect（認可コードフロー + PKCE）によるサインイン。パスワードの照合は Candy Rain ID が行う |
| bcryptjs | seed でのデモユーザーのパスワードハッシュ生成 |
| Stripe（テストモード） | カードの保存（SetupIntent）と与信・売上確定（PaymentIntent） |
| Tailwind CSS 4 / shadcn/ui / Base UI / Lucide | レスポンシブ UI と共通コンポーネント |
| Node.js Test Runner / tsx / Playwright | 単体・DB 統合・ブラウザー E2E テスト |
| Docker Compose / GitHub Actions / Vercel | ローカル DB、継続的な品質確認、ホスティング |

具体的な依存バージョンは [package.json](package.json) と [package-lock.json](package-lock.json) を参照してください。

## どう設計したか

UI、入力を受け付ける Server Action、業務処理を担う Service、DB アクセスを担う Repository の責務を分けています。完全に抽象化しきるのではなく、処理のまとまりと整合性を優先し、段階的に整理しています。

```text
app/            ページ・UI・Server Actions
  ↓
services/
  ↓
repositories/
  ↓
Prisma → PostgreSQL
```

カート操作は Repository を通します。一方、注文確定は複数テーブルを一括更新するため、[checkoutService](services/checkout/checkoutService.ts) が Prisma のトランザクションを直接管理します。

## どう実装したか

- **注文と在庫の整合性**：在庫が注文数量以上の場合だけ減算します。在庫不足や注文作成の失敗時はトランザクションをロールバックし、途中の減算を残しません。注文には購入時のバリエーション名と価格を保存します。
- **決済と注文の整合性**：カードで金額を与信（オーソリ）してから注文を作成し、注文の保存後に売上を確定します。在庫不足などで注文を作成できなかった場合は与信を取り消すため、注文のない請求は発生しません。カード情報は Stripe が保管し、ストアには Stripe の ID と表示用のブランド・下4桁だけを保存します。
- **キャンセルと返金の整合性**：キャンセルはまず DB（在庫戻し・発送状態の更新）を確定し、そのあと冪等キー付きで Stripe に返金します。返金に失敗しても注文のキャンセルは取り消さず、支払い状態を「返金エラー」として記録し、管理画面から再試行できます。
- **入力・所有者の確認**：ID や数量、更新操作をサーバーで検証し、サインイン中のユーザーが所有するカート・注文を対象にします。数量は 1〜99 を受け付けます。氏名・お届け先は全角文字を正規化したうえで項目ごとに検証し、エラー時は入力値を保持して表示します。
- **商品画像の一貫性**：[画像対応表](assets/candy-collection/shop-assets/image-mapping.json) を通して商品・バリエーションと素材を対応付けています。

## 学びと今後への活かし方

| 実装を通じて扱った課題 | 学び | 今後への活かし方 |
| --- | --- | --- |
| 在庫減算・注文作成・カート削除 | 一つずつ成功するだけでは購入処理全体の整合性を保証できない | 複数データの更新では、先にトランザクションの境界と失敗時の状態を設計する |
| UI と業務処理の分離 | 画面から業務ルールを分離すると、処理単位で検証しやすい | 機能追加でも Service と Repository の責務を見直し、変更範囲を限定する |
| 単体・統合・E2E テスト | 計算、DB の整合性、画面操作では必要な検証の粒度が異なる | 変更対象に応じてテストを配置し、CI で回帰を検出する |

## ローカル開発

Node.js 26 と npm 11.6.2 を使用します（CI と同じ構成）。Vercel は Node.js 26 に未対応のため、本番はプロジェクト設定の Node.js 24 でビルドします。サインインに使う Candy Rain ID を `go run` で起動するため、[Go](https://go.dev/dl/) 1.26 以降も必要です。

```bash
git clone https://github.com/Sparklingstadt/candy-rain-official-store.git
cd candy-rain-official-store
npm ci
```

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

カード決済を試す場合は、[Stripe のテストモード](https://docs.stripe.com/keys#test-live-modes)の API キーを `.env` の `STRIPE_SECRET_KEY`（`sk_test_` から始まる値）と `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`（`pk_test_`）に設定します。未設定の場合は決済なしで注文が確定します。本番用のキーは受け付けません。

[localhost:3000](http://localhost:3000) を開きます。`db:setup` は設定確認、DB 起動、migration、seed を順に実行します。seed はデモユーザーのパスワード更新も含むため、学習用 DB を対象にしてください。管理画面を使う場合は、seed の前に `.env` の `SEED_ADMIN_PASSWORD` に12文字以上のパスワードを設定します（未設定なら管理者は作成されません）。

5432 番ポートが使用中の場合は `.env` の `POSTGRES_PORT` と `DATABASE_URL` のポートを両方とも空きポートに変更します。`npm run dev` は設定を確認し PostgreSQL コンテナを起動してから、Candy Rain ID（`http://localhost:8080`）と Next.js を起動します。Candy Rain ID は同じ DB の `User` テーブルを参照するため、seed のデモユーザーでそのままサインインできます。使う Candy Rain ID のバージョンは [scripts/identityServer.mts](scripts/identityServer.mts) で固定しています。

```bash
npm run db:start  # PostgreSQL を起動し healthcheck を待つ
npm run db:logs   # PostgreSQL のログを表示
npm run db:stop   # 停止する。データは volume に保持
```

## 品質チェックとデプロイ

```bash
npm test                   # 単体テスト
npm run lint
npm run typecheck          # Prisma・Next.js の型生成も含む
npm run build
npm run test:integration   # DB 統合テスト
npm run test:e2e           # ブラウザー E2E（決済なしの購入フロー）
npm run test:e2e:stripe    # Stripe テストモードでのカード登録・決済 E2E（要テスト用キー）
```

DB 統合・E2E テストには migration と seed を適用した専用のローカル PostgreSQL を使用してください。`test:e2e` はデータをリセットし、シード以外の商品（ID 5 以上。管理画面で登録したもの）も削除するため、共有 DB や公開デモ・本番の DB を対象にしないでください。Playwright の初回実行前には `npx playwright install chromium` を実行します。

[GitHub Actions](.github/workflows/ci.yml) は main・dev への push、すべての Pull Request、手動実行を対象に次のチェックを実行します。

| ジョブ | 検証内容 |
| --- | --- |
| `verify` | 本番依存の npm audit（moderate 以上で失敗）、単体テスト、lint、Prisma・Next.js の型生成と TypeScript チェック、本番ビルド |
| `e2e` | 一時的な PostgreSQL 18 に schema 検証・migration・seed を適用し、DB 統合テストと Playwright テスト。サインインは `go run` で起動した Candy Rain ID を経由する |
| `CI passed` | 上記2ジョブがすべて成功したことを確認（失敗・キャンセル・スキップは不合格） |

ブランチ保護の必須チェックには `CI passed` を指定できます（リポジトリ側で別途設定）。E2E ジョブの HTML レポートと失敗時の trace・スクリーンショットは `playwright-local` Artifact に7日間保存します。CI 中の `test.only` を禁止します。テストは一時 DB を使い、本番の認証情報を必要としません。

Actions はコミット SHA に固定し、Dependabot が毎週更新 PR を作成します。検証と migration の権限は `contents: read` に限定し、checkout 後に Git 認証情報を保持しません。新しいコミットが届いた場合は同じ PR の古い CI をキャンセルします。参考：[GitHub の安全な Actions 運用](https://docs.github.com/en/actions/reference/security/secure-use)、[Playwright の CI ガイド](https://playwright.dev/docs/ci)。

main への push では、2つの検証ジョブと `CI passed` の成功後に `release` ジョブが GitHub Release を自動作成します。PR・dev への push・手動実行では Release を作成しません。既存の最大の安定版タグ `vX.Y.Z` の patch を1つ増やし（例：`v0.9.0` → `v0.9.1`）、検証したコミット SHA にタグを付けてリリースノートを自動生成します。同じ SHA の公開済み Release は再利用し、タグだけ作成済みの場合はそのタグで再試行します。既存の draft/prerelease は上書きしません。Release のタグが検証済み SHA と一致することも確認します。

書き込み権限は `release` ジョブだけに付与し、リリース処理は直列化します。main の実行は新しい push で中断しません。Vercel デプロイは別途行い、本番 DB の migration は既存の手動ワークフローを使用します。

本番は [Vercel](https://candy-rain-official-store.vercel.app) で公開しています。通常のビルドは DB を更新しません。DB の migration は対象の `DATABASE_URL` を確認して `npm run db:migrate` を実行するか、[Migrate production database](.github/workflows/migrate-production.yml) を手動実行します。後者では GitHub の `production` Environment に `DATABASE_URL` secret を設定します。

`User` のメールアドレスは大文字・小文字を区別せず一意です（`User_email_lower_key`、Candy Rain ID もこの名前で重複を判定します）。本番に適用する前に、次の SQL が 0 行であることを確認します。重複があると migration は件数を示して失敗します。

```sql
SELECT lower(email), count(*) FROM "User" GROUP BY 1 HAVING count(*) > 1;
```

重複で migration が失敗した場合は、次の SQL で該当の行を確認して修正します。その後 `npx prisma migrate resolve --rolled-back 20261028000000_user_email_lower_unique` を実行し、migration をもう一度適用します。

```sql
SELECT id, email FROM "User" WHERE lower(email) IN (SELECT lower(email) FROM "User" GROUP BY 1 HAVING count(*) > 1) ORDER BY lower(email), id;
```

インデックスは通常の `CREATE UNIQUE INDEX` で作成するため、作成中は `User` への書き込みが短時間ブロックされます。現在のテーブル規模では問題ありませんが、行数が多い場合は利用の少ない時間帯に適用してください。

管理画面で登録できる商品は 30 件までで、物理削除の画面はありません。公開デモで上限に達した場合は、注文に使われていない登録商品（ID 5 以上）を次のコマンドで削除できます。既定は対象の一覧を表示するだけで、`--apply` を付けたときだけ削除します。注文履歴のある商品とシードの商品（ID 0〜4）は削除しません。

```bash
npm run db:cleanup-demo-products            # 接続先と削除対象を表示する（削除しない）
npm run db:cleanup-demo-products -- --apply # 削除する
```

実行前に、表示される接続先が意図した DB（公開デモの DB など）であることを確認してください。削除は元に戻せません。

ページ表示・商品操作・desktop/mobile の ARIA スナップショットの対象と更新手順は [E2E テストガイド](e2e/README.md) を参照してください。

## 今後の課題

- Service と Repository の責務を引き続き整理し、テスト対象を拡大する
- デモ用認証から実運用向けのアカウント運用へ進める際の要件を整理する

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
