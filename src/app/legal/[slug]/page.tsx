import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArticle, legalSlugs } from '@/lib/content';
import { Article } from '@/components/Article';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

/** Fully static — these never change per request. */
export const dynamicParams = false;
export function generateStaticParams() {
  return legalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  return a ? { title: `${a.title} — RetireMeter`, description: a.lede } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article || article.section !== 'Legal') notFound();
  return (
    <>
      <SiteHeader />
      <main><Article article={article} /></main>
      <SiteFooter />
    </>
  );
}
