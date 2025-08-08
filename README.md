# Next.js ブログ テンプレート

Next.js、TypeScript、Tailwind CSSで構築されたモダンなブログテンプレートです。

## 特徴

- **Next.js 15** - 最新のApp Routerを使用
- **TypeScript** - 型安全性と開発体験の向上
- **Tailwind CSS** - モダンなスタイリング
- **CSS Modules** - コンポーネントレベルのスタイリング
- **ベストプラクティス** - 2024年の推奨ディレクトリ構成
- **レスポンシブデザイン** - モバイルファースト
- **SEO最適化** - メタデータとパフォーマンス最適化

## ディレクトリ構成

```
nextjs-blog/
├── app/
│   ├── api/              # APIルート
│   ├── components/       # 再利用可能なコンポーネント
│   │   ├── ui/          # UIコンポーネント
│   │   └── layout/      # レイアウトコンポーネント
│   ├── hooks/           # カスタムフック
│   ├── lib/             # ユーティリティ関数
│   ├── styles/          # グローバルスタイル
│   ├── types/           # TypeScript型定義
│   └── ...
├── public/              # 静的アセット
└── middleware.ts        # ミドルウェア
```

## 開始方法

### 前提条件

- Node.js 18.0.0以上
- pnpm（推奨）またはnpm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/Matsudo-S/template_nextjs.git
cd template_nextjs

# 依存関係をインストール
pnpm install
```

### 開発サーバーの起動

```bash
pnpm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて結果を確認してください。

### ビルド

```bash
pnpm run build
```

### 本番環境での起動

```bash
pnpm start
```

## 使用技術

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [TypeScript](https://www.typescriptlang.org/) - 型安全なJavaScript
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストCSS
- [React](https://reactjs.org/) - UIライブラリ

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します！
