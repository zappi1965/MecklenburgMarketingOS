'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  LayoutDashboard, BarChart3, Bot, KeyRound, Shield, FileText,
  Star, Mail, Megaphone, AlarmClock, CreditCard, ChartLine,
  Wallet, Menu, X, LogOut, User, ScanLine, Search, Activity,
  Wrench, FileSearch, CalendarClock, Rocket, FileCode2, FileSpreadsheet, Database, Sparkles,
  BrainCircuit, Gauge, TrendingUp
} from 'lucide-react'
import { getCurrentUserProfile, supabaseAuth } from '@/lib/authClient'

type NavSection = {
  label: string
  items: Array<{ href: string; label: string; icon: any; hint?: string }>
}

const NAV: NavSection[] = [
  {
    label: 'Ueberblick',
    items: [
      { href: '/admin/ops', label: 'Health-Cockpit', icon: Activity, hint: 'Wo brennt\'s über alle Customer' },
      { href: '/admin/maintenance', label: 'Wartungs-Reminder', icon: Wrench, hint: 'Tages-Scan: Logo, Loyalty, MFA, ...' },
      { href: '/admin/audits', label: 'Onboarding-Audits', icon: FileSearch, hint: 'Multi-Check pro Customer' },
      { href: '/admin/insights', label: 'Insights', icon: BarChart3, hint: 'Compliance, CLV, Cohorts' },
      { href: '/admin/customer-intelligence', label: 'Customer Intelligence', icon: BrainCircuit, hint: 'Health-/Risiko-/Upsell-Score, Monatsreports' },
      { href: '/value-dashboard', label: 'Value Dashboard', icon: BarChart3, hint: 'Kundennutzen & Reports' },
      { href: '/growth-command', label: 'Growth Command', icon: BarChart3, hint: 'Alle 12 Bereiche' },
      { href: '/admin/automations', label: 'Workflows', icon: Bot, hint: 'Cross-Modul-Regeln' }
    ]
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/seo', label: 'SEO & Sichtbarkeit', icon: Search, hint: 'Dashboard, Heatmap, KPI, Wettbewerber' },
      { href: '/admin/gmb', label: 'Google Business', icon: Megaphone },
      { href: '/admin/social', label: 'AI Social-Posts', icon: Sparkles, hint: 'KI-Posts fuer Instagram, Facebook, Google, LinkedIn' },
      { href: '/admin/tools', label: 'Kundentools', icon: Megaphone, hint: 'Module, Pakete, Add-ons' },
      { href: '/reputation-center', label: 'Reputation Center', icon: Star },
      { href: '/slug-hub', label: 'Slug-Hub', icon: Megaphone },
      { href: '/admin/sales/lead-engine', label: 'Lead Engine', icon: Megaphone },
      { href: '/admin/sales/value-offers', label: 'Angebote', icon: FileText },
      { href: '/admin/widget', label: 'Bewertungs-Widget', icon: Star },
      { href: '/admin/review-intelligence', label: 'Review Intelligence', icon: Gauge, hint: 'Sentiment-Profil, Vorlagen' },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
      { href: '/admin/mail-assistant', label: 'AI Mail-Assistant', icon: Mail }
    ]
  },
  {
    label: 'Betrieb',
    items: [
      { href: '/admin/booking', label: 'Online-Terminbuchung', icon: CalendarClock, hint: 'Leistungen, Zeiten, Buchungs-Widget' },
      { href: '/admin/loyalty-scan', label: 'Loyalty-Scan (Kasse)', icon: ScanLine, hint: 'Kunden-QR scannen, Punkte buchen' },
      { href: '/admin/no-show', label: 'No-Show-Risiko', icon: AlarmClock },
      { href: '/loyalty/growth', label: 'Loyalty Growth', icon: ScanLine },
      { href: '/automation/playbooks', label: 'Automation Playbooks', icon: AlarmClock },
      { href: '/media/report-center', label: 'Media & Reports', icon: FileText }
    ]
  },
  {
    label: 'Finanzen',
    items: [
      { href: '/admin/e-invoice', label: 'E-Rechnung', icon: FileCode2, hint: 'XRechnung / ZUGFeRD (DE-Pflicht im B2B)' },
      { href: '/admin/accounting', label: 'Buchhaltungs-Export', icon: FileSpreadsheet, hint: 'DATEV / lexoffice / sevDesk' },
      { href: '/admin/pos', label: 'Kassen-Anbindung', icon: CreditCard, hint: 'POS-/SumUp-Transaktionen' },
      { href: '/admin/dunning', label: 'Mahnstufen', icon: ChartLine },
      { href: '/admin/revenue-forecast', label: 'Umsatz-Prognose', icon: TrendingUp, hint: 'Forecast, Nutzung, Paket-Empfehlung' },
      { href: '/admin/pricing', label: 'Smart Pricing', icon: Wallet }
    ]
  },
  {
    label: 'Verwaltung',
    items: [
      { href: '/admin/onboarding', label: 'Einrichtungs-Assistent', icon: Rocket, hint: 'Gefuehrtes Setup: Branding, QR, Loyalty' },
      { href: '/admin/data-quality', label: 'Datenqualitaet', icon: Database, hint: 'Dubletten, E-Mail-Check, AI-Review-Antwort' },
      { href: '/admin/compliance', label: 'DSGVO-Cockpit', icon: FileText },
      { href: '/admin/api-keys', label: 'API-Keys', icon: KeyRound },
      { href: '/admin/tool-access-v2', label: 'Tool-Freigaben Pro', icon: Shield },
      { href: '/crm/customer-health', label: 'Customer Health', icon: BarChart3 },
      { href: '/admin/security', label: 'Sicherheit & 2FA', icon: Shield },
      { href: '/admin/demo-data', label: 'Demo-Daten', icon: FileText }
    ]
  }
]

const PERSONAL_NAV = [
  { href: '/privacy/me', label: 'Meine Daten', icon: User }
]

export default function AdminShell({
  children,
  activeHref
}: {
  children: ReactNode
  activeHref?: string
}) {
  const [profile, setProfile] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    getCurrentUserProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const currentPath = activeHref || (typeof window !== 'undefined' ? window.location.pathname : '')

  function isActive(href: string) {
    return currentPath === href || currentPath.startsWith(href + '/')
  }

  async function logout() {
    try { await supabaseAuth.auth.signOut() } catch {}
    if (typeof window !== 'undefined') window.location.href = '/auth'
  }

  return (
    <div className={`adminShell ${drawerOpen ? 'drawerOpen' : ''}`}>
      <aside className="adminSidebar">
        <div className="adminSidebarHeader">
          <a href="/admin/insights" className="adminBrand">
            <span className="adminBrandMark">M</span>
            <span className="adminBrandText">MMOS</span>
          </a>
          <button type="button" className="adminDrawerClose" aria-label="Menue schliessen" onClick={() => setDrawerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="adminNav" aria-label="Admin-Navigation">
          {NAV.map((section) => (
            <div key={section.label} className="adminNavSection">
              <div className="adminNavSectionLabel">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={active ? 'adminNavItem active' : 'adminNavItem'}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span>{item.label}</span>
                  </a>
                )
              })}
            </div>
          ))}

          <div className="adminNavSection">
            <div className="adminNavSectionLabel">Persoenlich</div>
            {PERSONAL_NAV.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <a key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} className={active ? 'adminNavItem active' : 'adminNavItem'}>
                  <Icon size={16} strokeWidth={2} />
                  <span>{item.label}</span>
                </a>
              )
            })}
          </div>
        </nav>

        <div className="adminSidebarFooter">
          {mounted && profile && (
            <div className="adminProfile">
              <div className="adminProfileMark">{(profile.display_name || profile.email || '?').slice(0, 1).toUpperCase()}</div>
              <div className="adminProfileText">
                <strong>{profile.display_name || profile.email}</strong>
                <span>{profile.role}</span>
              </div>
            </div>
          )}
          <button type="button" className="adminLogout" onClick={logout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <header className="adminTopbar">
        <button type="button" className="adminMenuBtn" aria-label="Menue oeffnen" onClick={() => setDrawerOpen(true)}>
          <Menu size={22} />
        </button>
        <a href="/admin/insights" className="adminBrand inline">
          <span className="adminBrandMark">M</span>
          <span className="adminBrandText">MMOS</span>
        </a>
      </header>

      <main className="adminContent">
        {children}
      </main>

      {drawerOpen && <div className="adminDrawerOverlay" onClick={() => setDrawerOpen(false)} />}
    </div>
  )
}
