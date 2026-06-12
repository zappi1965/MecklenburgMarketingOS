import type { Metadata } from 'next'
import { headers } from 'next/headers'
import PublicMiniSite from '@/components/public/PublicMiniSite'

export const dynamic = 'force-dynamic'

// Server-seitiger Best-Effort-Fetch des öffentlichen Site-DTOs für SEO-Metadaten.
async function fetchSite(slug: string): Promise<any | null> {
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host')
    const proto = h.get('x-forwarded-proto') || 'https'
    if (!host) return null
    const res = await fetch(`${proto}://${host}/api/v33-functional/public/site/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json?.site || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const site = await fetchSite(slug)
  if (!site) return { title: 'Mini-Website · MMOS', robots: { index: false } }
  const name = site.brand?.name || 'Unser Betrieb'
  const description = site.hero?.subline || `${name}${site.branch ? ` – ${site.branch}` : ''}. Leistungen, Öffnungszeiten und Kontakt.`
  return {
    title: site.hero?.headline || name,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title: site.hero?.headline || name,
      description,
      type: 'website',
      images: site.hero?.image_url ? [{ url: site.hero.image_url }] : undefined
    }
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await fetchSite(slug)
  return <PublicMiniSite slug={slug} initialSite={site} />
}
