# Candy Club — Candy Rain Official Storeの商品素材

Blender 5.2.2 / Cyclesで作成した、キャンディーモチーフの3D商品モックアップです。
`prd-ec-shop/prisma/seed.ts`の全5商品・10バリエーションに対応しています。

- ランダム缶バッジ：販売Variant 0の内容物として5色。
- クリアファイル：A/B（追加生成）。
- アクリルスタンド：A/B/C。
- タペストリー：A/B。
- オリジナルTEE：A/B（追加生成）。

合計14種類の見た目です。色割当・商品ID・Variant IDは `catalog-audit.md` を参照してください。

## ファイル

- `index.html`：全14種類を閲覧できる一覧ページ。
- `candy-collection.blend`：全14種類の編集用集合シーン。
- `additional-products.blend`：今回追加した4種類の集合シーン。
- `models/`：各色の個別シーンと、商品ID別の集合シーン（product-0〜4）。
- `renders/`：各色および商品別の1200×1200 PNG・WebP、全体・追加分の集合画像。
- `textures/`：元の絵柄PNG。Blenderファイルにも画像を内包。
- `products.json`：見た目14種類の一覧。
- `shop-catalog.json`：seed由来の商品5件・Variant10件と素材の対応、照合元コミット。
- `shop-assets/public/products/candy/`：ショップのpublicへ配置できる商品5件＋Variant10件のWebP。
- `shop-assets/image-mapping.json`：商品ID・Variant IDごとの置換画像URL。
- `catalog-audit.md`：不足分と対応付けのレポート。
- `source/`：作成用スクリプト。

## 編集と利用

Blenderで開き、テンキー0でカメラ表示、F12でレンダリングできます。
個別ファイルは該当商品のコレクションだけを表示しています。他商品を非表示で保持する場合があります。

画像は商品紹介用モックアップです。製造用寸法・塗り足し・カットラインではありません。
TEEはアイボリー生地に、Aはピンク、Bはブルーのプリントと襟を使用しています。
A/B/Cの色指定はseedにないため、今回の統一デザインとして割り当てました。

照合はseedデータに対して行いました。素材はリポジトリの assets/candy-collection/ と public/products/candy/ に配置済みで、seedの画像パスも更新しています。DBへの適用は未実施です。
ショップ用画像は public/products/candy/ に配置済みです。対応するURLはseedに設定済みで、既存の一致する商品・Variantも画像URLだけを更新します。公開・DB更新は未実施です。

## Gitで配布する範囲

`.blend`と番号付きバックアップはGit管理対象外です。上記モデルファイルはローカルにのみ保持され、cloneには含まれません。素材一覧のBlenderリンクもモデルをローカルに用意した場合に使用できます。画像・テクスチャ・生成スクリプト・対応表はGitで配布します。
