import Link from 'next/link';
import type { Article as ArticleType } from '@/lib/content';

export function Article({ article }: { article: ArticleType }) {
  return (
    <article className="mx-auto max-w-[720px] px-6 py-10">
      <Link href="/" className="m3-btn-text -ml-4">← Back</Link>
      <p className="mt-4 text-xs font-bold tracking-[.05em] text-primary">
        {article.section.toUpperCase()}
      </p>
      <h1 className="mt-3 text-[27px] font-bold tracking-[-.035em] md:text-[38px]">{article.title}</h1>
      <p className="mb-8 mt-2.5 text-lg leading-relaxed text-ink-variant">{article.lede}</p>
      <div className="prose-rm" dangerouslySetInnerHTML={{ __html: article.body }} />
      <p className="mt-9 border-t border-ink-line pt-5 text-[11.5px] leading-relaxed text-ink-outline">
        RetireMeter is a calculator and personal tracking tool. It is not a SEBI-registered investment
        adviser, does not provide investment advice, and does not recommend or distribute any financial
        product. Nothing on this page is a recommendation to buy, sell or hold anything.
      </p>
    </article>
  );
}
