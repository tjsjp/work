# Work Files SPA

userscriptから取得したデータを表示・編集できるSPA（Single Page Application）

## 機能

- work_idで絞り込んだ画像ファイル一覧の表示
- report_slotsの表示と編集
- 未割当ファイルの表示
- ドラッグ&ドロップによるファイルの割り当て
- スロットの並び替え（sort_index更新）
- 2列グリッド表示（6個ずつ、区切り線対応）

## セットアップ

### 1. 依存関係のインストール

```bash
cd spa
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス

### 3. ビルド

```bash
npm run build
```

`dist/` フォルダに最適化されたファイルが生成されます。

### 4. GitHub Pagesへのデプロイ

1. `vite.config.js` の `base` パスをリポジトリ名に合わせて設定
2. `npm run build` でビルド
3. `dist/` フォルダの内容をGitHub Pagesにデプロイ

## 必要なSupabase Edge Functions

以下のEdge Functionsが必要です：

- `get_work_file_list`: work_idでwork_filesを取得
- `get_report_slot`: work_idでreport_slotsを取得
- `assign_file_to_slot`: ファイルをスロットに割り当て
- `upsert_slot_order`: スロットの順序を更新
- `upsert_report_slot`: スロットの情報を更新（work_phase_id, note, break_before）
- `get_work_file_url`: 画像の署名URLを取得
- `upload_work_file`: ファイルをアップロード
- `insert_report_slot`: 新しいスロットを挿入

## プロジェクト構造

```
spa/
├── index.html              # エントリーポイント
├── package.json            # 依存関係
├── vite.config.js          # Vite設定
├── src/
│   ├── main.js            # Vue.js初期化
│   ├── App.vue            # メインコンポーネント
│   ├── components/
│   │   ├── UnassignedFiles.vue  # 未割当ファイル一覧
│   │   ├── SlotGrid.vue         # スロットグリッド
│   │   └── SlotItem.vue         # スロットアイテム
│   ├── services/
│   │   └── supabase.js    # Supabase Edge Functions API
│   ├── utils/
│   │   └── slotSorting.js # sort_index処理ユーティリティ
│   └── styles/
│       └── main.css       # メインスタイル
└── dist/                  # ビルド出力（自動生成）
```

## 使用方法

1. Work IDを入力
2. 「データ読み込み」ボタンをクリック
3. 左側の未割当ファイルを右側のスロットにドラッグ&ドロップ
4. スロットをドラッグ&ドロップで並び替え

## 技術スタック

- Vue.js 3 (Composition API)
- Vite
- Supabase Edge Functions
- HTML5 Drag and Drop API

