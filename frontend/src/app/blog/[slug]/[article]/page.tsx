export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { markdownToHtml } from '@/lib/miniMarkdown'

type Article = { title: string; slug: string; meta_description?: string; body_markdown: string; cover_image_url?: string | null; published_at?: string; language?: string }
type ArticleData = { ok: boolean; blog: { slug: string; business_name: string }; article: Article }

async function fetchArticle(slug: string, articleSlug: string): Promise<ArticleData | null> {
  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  try {
    const res = await fetch(`${proto}://${host}/api/public/seo-blog/${encodeURIComponent(slug)}/${encodeURIComponent(articleSlug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as ArticleData
  } catch { return null }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; article: string }> }) {
  const { slug, article } = await params
  const data = await fetchArticle(slug, article)
  if (!data?.ok) return { title: 'Beitrag nicht gefunden' }
  return {
    title: data.article.title,
    description: data.article.meta_description || undefined,
    robots: { index: true, follow: true },
    openGraph: { title: data.article.title, description: data.article.meta_description || undefined, type: 'article' }
  }
}

function fmtDate(s?: string) {
  if (!s) return ''
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(s)) } catch { return '' }
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string; article: string }> }) {
  const { slug, article } = await params
  const data = await fetchArticle(slug, article)
  if (!data?.ok) notFound()
  const a = data.article
  const html = markdownToHtml(a.body_markdown)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.meta_description || '',
    datePublished: a.published_at || undefined,
    author: { '@type': 'Organization', name: data.blog.business_name || undefined }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div style={{ marginBottom: 18 }}>
        <Link href={`/blog/${slug}`} style={{ fontSize: 13, color: '#7c5cff', textDecoration: 'none', fontWeight: 600 }}>← Zurück zum Blog</Link>
      </div>
      <article>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.25 }}>{a.title}</h1>
        {a.published_at && <div style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>{fmtDate(a.published_at)} · {data.blog.business_name}</div>}
        {a.cover_image_url && <img src={a.cover_image_url} alt="" style={{ width: '100%', borderRadius: 14, margin: '0 0 28px', display: 'block' }} />}
        <div className="seo-blog-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  )
}
