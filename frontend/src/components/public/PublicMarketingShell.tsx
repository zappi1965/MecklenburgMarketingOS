'use client'

import { ReactNode } from 'react'
import LegalFooter from '@/components/legal/LegalFooter'

type PublicMarketingShellProps = {
  brandName?: string | null
  logoUrl?: string | null
  accent?: string | null
  children: ReactNode
  backHref?: string
}

// Auth-freier Marken-/Card-/Footer-Rahmen für öffentliche Marketing-Seiten
// (Referral /r, Deals /deal, Mini-Website /site). Nutzt vorhandene Public-CSS.
export default function PublicMarketingShell({
  brandName,
  logoUrl,
  accent,
  children,
  backHref = '/'
}: PublicMarketingShellProps) {
  return (
    <main className="publicLoyaltyPage" style={accent ? ({ ['--mmos-accent' as any]: accent }) : undefined}>
      <section className="publicHero">
        <div className="publicCard">
          <header className="publicBrandRow" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName || 'Logo'} style={{ height: 44, width: 'auto', borderRadius: 8 }} />
            ) : null}
            {brandName ? <strong style={{ fontSize: 18 }}>{brandName}</strong> : null}
          </header>
          {children}
        </div>
      </section>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <a className="legalBack" href={backHref}>← Zur Startseite</a>
      </div>
      <LegalFooter />
    </main>
  )
}
