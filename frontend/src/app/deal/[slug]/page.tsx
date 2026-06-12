import type { Metadata } from 'next'
import { headers } from 'next/headers'
import PublicDeal from '@/components/public/PublicDeal'

export const dynamic = 'force-dynamic'

// Best-Effort-Server-Fetch des Public-Deals für SEO + SSR.
async function fetchDeal(slug: string): Promise<{ deal: any | null; ended: boolean }> {
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host')
    const proto = h.get('x-forwarded-proto') || 'https'
    if (!host) return { deal: null, ended: false }
    const res = await fetch(`${proto}://${host}/api/v33-functional/public/deal/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.status === 410) return { deal: null, ended: true }
    if (!res.ok) return { deal: null, ended: false }
    const json = await res.json()
    return { deal: json?.deal || null, ended: false }
  } catch {
    return { deal: null, ended: false }
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { deal } = await fetchDeal(slug)
  if (!deal) return { title: 'Aktion · MMOS', robots: { index: false } }
  const title = deal.discount_label ? `${deal.discount_label} – ${deal.title}` : deal.title
  const description = deal.subtitle || deal.body || 'Zeitlich begrenzte Aktion.'
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      images: deal.image_url ? [{ url: deal.image_url }] : undefined
    }
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { deal, ended } = await fetchDeal(slug)
  return <PublicDeal slug={slug} initialDeal={deal} initialEnded={ended} />
}
