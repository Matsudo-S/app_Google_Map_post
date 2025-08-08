import Layout from './components/layout/layout';
import Card from './components/ui/card/card';
import Button from './components/ui/button/button';

export default function Home() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Next.js ブログへようこそ
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Next.js、TypeScript、Tailwind CSSで構築されたモダンなブログ
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" size="large">
              始めましょう
            </Button>
            <Button variant="secondary" size="large">
              詳しく見る
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card title="高速パフォーマンス">
            <p>
              Next.jsで構築され、最適なパフォーマンスとSEOを実現。高速なページ読み込みと優れたユーザー体験をお楽しみください。
            </p>
          </Card>
          <Card title="TypeScript対応">
            <p>
              完全なTypeScriptサポートにより、より良い開発体験、型安全性、そして改善されたコード品質を提供します。
            </p>
          </Card>
          <Card title="モダンデザイン">
            <p>
              Tailwind CSSを使用した美しくレスポンシブなデザインで、クリーンでモダンな美学を実現します。
            </p>
          </Card>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            準備はできましたか？
          </h2>
          <p className="text-gray-600 mb-8">
            ブログ記事を探索して、素晴らしいコンテンツを発見しましょう。
          </p>
          <Button variant="primary" size="large">
            ブログ記事を見る
          </Button>
        </section>
      </div>
    </Layout>
  );
}
