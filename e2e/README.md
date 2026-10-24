# E2E テスト

Issue #4（ページ表示）、#21（商品操作）、#12（スナップショット）を検証します。

## 実行

ローカル Docker DB の接続先を `.env` に設定し、Docker Desktop を起動してください。

```bash
npm run db:setup
npx playwright install chromium
npm run test:e2e
```

Playwright が production build を作成し、`http://127.0.0.1:3118` でテスト専用サーバーを起動します。
既存サーバーは再利用しません。

## 対象

- `account.spec.ts`: お届け先の入力エラー表示（入力値の保持）と保存、氏名の変更とアカウントへの反映。
- `payment.spec.ts`: Stripe テストモードでのカード登録・削除、カードを選んだ決済、決済拒否、3D セキュア認証。`npm run test:e2e:stripe` で実行し、テスト用キーが未設定ならスキップします。通常の `npm run test:e2e` は Stripe のキーを無効にして決済なしの購入フローを確認します。
- `pages.spec.ts`: 商品一覧のローディングと5件の商品、カート、注文履歴、アカウント、注文詳細、サインアウト後のセッション破棄。
- `products.spec.ts`: 一覧から詳細、バリエーション選択、カート数量変更・再読み込み・削除、不正／存在しない商品ID。
- `snapshots.spec.ts`: desktop（1280×800）と mobile（390×844）で主要8ページの ARIA スナップショット。表示内容、見出し、リンク先、フォームのラベルと操作要素を比較します。色やピクセル単位の外観比較ではありません。
- `store.spec.ts`: 既存の購入フロー、認証エラー、在庫制約、画像表示・切り替え。

追加テストは毎回専用ユーザーとカートを作成し、終了時にそのユーザーの注文・カート・アカウントを削除します。購入で減った在庫も、そのユーザーの注文数量だけ戻します。
商品一覧のローディングは DB のトランザクションロックで読み取りを一時停止して確認し、`finally` で必ず解除します。共有カタログを使うため `workers: 1` を維持してください。
既存の `npm run test:e2e` は開始時に `prisma/reset-e2e.ts` を実行するため、必ずテスト用 DB に接続してください。

サインアウトの回帰テストは、完了画面の再読み込み、セッション API の未認証状態、未認証の先読みリクエストも確認します。Proxy は認証判定だけを行い、Cookie の変更は Auth.js の認証処理に任せています。通常ページの応答ではセッション期限を延長しません。これは遅れて届いたページ応答によるログアウト済み Cookie の復元を防ぐためです。

## スナップショットの更新

通常実行では基準の欠落も失敗にします。意図した UI 変更がある場合だけ次を実行し、YAML の差分を確認してください。

```bash
npx playwright test e2e/snapshots.spec.ts --update-snapshots
npx playwright test e2e/snapshots.spec.ts
```

基準は `e2e/__snapshots__/snapshots.spec.ts/` にあります。
OS 共通の ARIA スナップショットを使うため、macOS と Linux CI で同じ基準を比較できます。
Playwright が生成する数値の正規表現は可変値を許容します。注文詳細の見出しは、更新後も `- 'heading /注文 #\d+/ [level=1]'` として注文IDだけを可変にしてください（`#` を含むため YAML の引用符が必要です）。購入金額や数量は機能テストで具体値を検証します。
失敗時は `test-results/` のスクリーンショットとエラーコンテキスト、CI リトライ時は trace で調査できます。
