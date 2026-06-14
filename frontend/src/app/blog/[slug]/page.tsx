export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type BlogArticle = { title: string; slug: string; meta_description?: string; published_at?: string; language?: string }
type BlogData = { ok: boolean; blog: { slug: string; business_name: string }; articles: BlogArticle[] }

async function fetchBlog(slug: string): Promise<BlogData | null> {
  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  try {
    const res = await fetch(`${proto}://${host}/api/public/seo-blog/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as BlogData
  } catch { return null }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchBlog(slug)
  const name = data?.blog?.business_name || 'Blog'
  return {
    title: `Blog – ${name}`,
    description: `Aktuelle Beiträge und Tipps von ${name}.`,
    robots: { index: true, follow: true }
  }
}

function fmtDate(s?: string) {
  if (!s) return ''
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(s)) } catch { return '' }
}

export default async function BlogIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchBlog(slug)
  if (!data?.ok) notFound()
  const name = data.blog.business_name || 'Blog'

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a' }}>
      <header style={{ marginBottom: 32 }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 12, color: '#7c5cff', fontWeight: 700 }}>Blog</p>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '6px 0 0' }}>{name}</h1>
      </header>
      {data.articles.length === 0 && <p style={{ color: '#666' }}>Noch keine Beiträge veröffentlicht.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 22 }}>
        {data.articles.map((a) => (
          <li key={a.slug} style={{ borderBottom: '1px solid #eee', paddingBottom: 22 }}>
            <Link href={`/blog/${slug}/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{a.title}</h2>
              {a.published_at && <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{fmtDate(a.published_at)}</div>}
              {a.meta_description && <p style={{ color: '#555', marginTop: 8 }}>{a.meta_description}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
