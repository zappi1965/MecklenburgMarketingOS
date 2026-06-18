import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Pro-Kunden-Blog-Sitemap (Milestone 5). Listet veroeffentlichte Artikel
// fuer Suchmaschinen. Quelle: oeffentlicher Backend-Endpoint.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const h = await headers()
  const host = h.get('host') || ''
  const proto = h.get('x-forwarded-proto') || 'https'
  const origin = `${proto}://${host}`

  let articles: Array<{ slug: string; published_at?: string }> = []
  try {
    const res = await fetch(`${origin}/api/public/seo-blog/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      articles = Array.isArray(data?.articles) ? data.articles : []
    }
  } catch { /* leere Sitemap bei Fehler */ }

  const urls = [
    `<url><loc>${origin}/blog/${slug}</loc></url>`,
    ...articles.map((a) => {
      const lastmod = a.published_at ? `<lastmod>${new Date(a.published_at).toISOString()}</lastmod>` : ''
      return `<url><loc>${origin}/blog/${slug}/${a.slug}</loc>${lastmod}</url>`
    })
  ].join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } })
}
