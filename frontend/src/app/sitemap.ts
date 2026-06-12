import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Dynamische Sitemap: statische Marketing-Routen + aktive Mini-Sites/Deals.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || ''
  const proto = h.get('x-forwarded-proto') || 'https'
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

  const staticRoutes = ['', '/impressum', '/datenschutz'].map((p) => ({
    url: `${base}${p || '/'}`,
    lastModified: new Date()
  }))

  let dynamicRoutes: MetadataRoute.Sitemap = []
  try {
    if (host) {
      const res = await fetch(`${proto}://${host}/api/v33-functional/public/sitemap-entries`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        const sites = (json?.sites || []).map((s: any) => ({ url: `${base}/site/${s.slug}`, lastModified: s.updated_at ? new Date(s.updated_at) : new Date() }))
        const deals = (json?.deals || []).map((d: any) => ({ url: `${base}/deal/${d.slug}`, lastModified: d.updated_at ? new Date(d.updated_at) : new Date() }))
        dynamicRoutes = [...sites, ...deals]
      }
    }
  } catch {
    /* best effort */
  }

  return [...staticRoutes, ...dynamicRoutes]
}
