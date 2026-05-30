'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3, Bot, KeyRound, Shield, FileText,
  Star, Mail, Megaphone, AlarmClock, CreditCard, ChartLine,
  Wallet, Menu, X, LogOut, User, ScanLine, Search, Activity,
  Wrench, FileSearch, CalendarClock, Rocket, FileCode2, FileSpreadsheet, Database, Sparkles,
  BrainCircuit, Gauge, TrendingUp, Target
} from 'lucide-react'
import { getCurrentUserProfile, supabaseAuth } from '@/lib/authClient'
import BrandLogo from '@/components/brand/BrandLogo'

type NavItem = { href: string; label: string; icon: any; hint?: string }
type NavSection = { label: string; items: NavItem[] }

const NEW_TOOL_NAV: NavItem[] = [
  { href: '/admin', label: 'Tool-Zentrale', icon: BarChart3, hint: 'Alle neuen Admin-Tools auf einen Blick' },
  { href: '/admin/training', label: 'Wissenstest', icon: BrainCircuit, hint: 'Quiz zu allen MMOS-Tools, Vertrieb, Datenschutz und Betrieb' },
  { href: '/admin/sales/mini-audit-generator', label: 'Mini Audit Generator', icon: FileSearch, hint: 'Google-only Mini-Audit für Akquise und Erstgespräch' },
  { href: '/admin/sales/lead-engine', label: 'Lead Engine', icon: Target, hint: 'Google-Places Lead-Suche und Akquise-Vorbereitung' },
  { href: '/admin/production', label: 'Production Readiness', icon: Activity, hint: 'Monitoring, Backups, API-Kosten und Admin-Logs' },
  { href: '/admin/production/security-core', label: 'Security Core', icon: Shield, hint: 'Tenant-Isolation, Rechte, Jobs und Migration Guard' },
  { href: '/media/report-center', label: 'Media & Reports', icon: FileText, hint: 'Interner Report- und Dokumentenbereich' },
  { href: '/portal/reports', label: 'Kundenportal Reports', icon: FileText, hint: 'Kundenansicht für freigegebene PDFs und Reports' }
]

const NAV: NavSection[] = [
  {
    label: 'Neu & wichtig',
    items: NEW_TOOL_NAV
  },
  {
    label: 'Überblick',
    items: [
      { href: '/admin/ops', label: 'Health-Cockpit', icon: Activity, hint: 'Wo brennt es über alle Kunden?' },
      { href: '/admin/maintenance', label: 'Wartungs-Reminder', icon: Wrench, hint: 'Tages-Scan: Logo, Loyalty, MFA, Datenqualität' },
      { href: '/admin/audits', label: 'Onboarding-Audits', icon: FileSearch, hint: 'Multi-Check pro Kunde' },
      { href: '/admin/insights', label: 'Insights', icon: BarChart3, hint: 'Compliance, CLV, Kohorten und Wachstum' },
      { href: '/admin/customer-intelligence', label: 'Customer Intelligence', icon: BrainCircuit, hint: 'Health-, Risiko- und Upsell-Score' },
      { href: '/value-dashboard', label: 'Value Dashboard', icon: BarChart3, hint: 'Kundennutzen, Nachweise und Monatsreports' },
      { href: '/growth-command', label: 'Growth Command', icon: TrendingUp, hint: 'Steuerung der Wachstumsbereiche' },
      { href: '/admin/automations', label: 'Workflows', icon: Bot, hint: 'Cross-Modul-Regeln und Automation' }
    ]
  },
  {
    label: 'Akquise & Vertrieb',
    items: [
      { href: '/admin/sales', label: 'Sales-Werkzeuge', icon: Target, hint: 'Google-Audit, Lead-Suche, Angebote und Verträge' },
      { href: '/admin/sales/lead-engine', label: 'Lead Engine', icon: Megaphone, hint: 'Lead Scraper, Mini-Audit und Paketempfehlung' },
      { href: '/admin/sales/mini-audit-generator', label: 'Mini Audit Generator', icon: FileSearch, hint: 'Automatischer Google-only Audit-Export' },
      { href: '/admin/sales/value-offers', label: 'Angebote', icon: FileText, hint: 'Value-Angebote aus Audit und Paketlogik' },
      { href: '/admin/tools', label: 'Pakete & Kundentools', icon: Megaphone, hint: 'Verkaufbare Module, Add-ons und Paketlogik' },
      { href: '/admin/tool-access-v2', label: 'Tool-Freigaben Pro', icon: Shield, hint: 'Freischaltungen pro Kunde und Paket' }
    ]
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/seo', label: 'SEO & Sichtbarkeit', icon: Search, hint: 'Dashboard, Heatmap, KPIs und Wettbewerber' },
      { href: '/admin/gmb', label: 'Google Business', icon: Megaphone },
      { href: '/admin/social', label: 'AI Social-Posts', icon: Sparkles, hint: 'KI-Posts für Instagram, Facebook, Google und LinkedIn' },
      { href: '/reputation-center', label: 'Reputation Center', icon: Star },
      { href: '/admin/review-intelligence', label: 'Review Intelligence', icon: Gauge, hint: 'Sentiment-Profil, Themen und Vorlagen' },
      { href: '/admin/widget', label: 'Bewertungs-Widget', icon: Star },
      { href: '/slug-hub', label: 'Slug-Hub', icon: Megaphone },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
      { href: '/admin/mail-assistant', label: 'AI Mail-Assistant', icon: Mail }
    ]
  },
  {
    label: 'Kundenportal & Betrieb',
    items: [
      { href: '/portal/reports', label: 'Kundenportal Reports', icon: FileText, hint: 'Freigegebene Reports und PDFs aus Kundensicht' },
      { href: '/media/report-center', label: 'Media & Reports', icon: FileText, hint: 'Reports, Angebote, Rechnungen und Dateien kundengenau verknüpfen' },
      { href: '/admin/booking', label: 'Online-Terminbuchung', icon: CalendarClock, hint: 'Leistungen, Zeiten und Buchungs-Widget' },
      { href: '/admin/loyalty-scan', label: 'Loyalty-Scan', icon: ScanLine, hint: 'Kunden-QR scannen und Punkte buchen' },
      { href: '/admin/no-show', label: 'No-Show-Risiko', icon: AlarmClock },
      { href: '/loyalty/growth', label: 'Loyalty Growth', icon: ScanLine },
      { href: '/automation/playbooks', label: 'Automation Playbooks', icon: Bot }
    ]
  },
  {
    label: 'Finanzen',
    items: [
      { href: '/admin/e-invoice', label: 'E-Rechnung', icon: FileCode2, hint: 'XRechnung / ZUGFeRD' },
      { href: '/admin/accounting', label: 'Buchhaltungs-Export', icon: FileSpreadsheet, hint: 'DATEV / lexoffice / sevDesk' },
      { href: '/admin/pos', label: 'Kassen-Anbindung', icon: CreditCard, hint: 'POS- und SumUp-Transaktionen' },
      { href: '/admin/dunning', label: 'Mahnstufen', icon: ChartLine },
      { href: '/admin/revenue-forecast', label: 'Umsatz-Prognose', icon: TrendingUp },
      { href: '/admin/pricing', label: 'Smart Pricing', icon: Wallet }
    ]
  },
  {
    label: 'Sicherheit & Verwaltung',
    items: [
      { href: '/admin/production', label: 'Production Readiness', icon: Activity, hint: 'E2E, Monitoring, Backups, API-Kosten und Logs' },
      { href: '/admin/production/security-core', label: 'Security Core', icon: Shield, hint: 'Tenant-Isolation, Jobs und Migration Guard' },
      { href: '/admin/onboarding', label: 'Einrichtungs-Assistent', icon: Rocket, hint: 'Geführtes Setup' },
      { href: '/admin/data-quality', label: 'Datenqualität', icon: Database, hint: 'Dubletten, E-Mail-Check und KI-Review-Antwort' },
      { href: '/admin/compliance', label: 'DSGVO-Cockpit', icon: FileText },
      { href: '/admin/api-keys', label: 'API-Keys', icon: KeyRound },
      { href: '/crm/customer-health', label: 'Customer Health', icon: BarChart3 },
      { href: '/admin/security', label: 'Sicherheit & 2FA', icon: Shield },
      { href: '/admin/demo-data', label: 'Demo-Daten', icon: FileText }
    ]
  }
]

const PERSONAL_NAV: NavItem[] = [
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
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    setMounted(true)
    setCurrentPath(window.location.pathname)
    getCurrentUserProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const activePath = activeHref || currentPath

  function isActive(href: string) {
    if (!activePath) return false
    if (href === '/admin') return activePath === '/admin'
    return activePath === href || activePath.startsWith(href + '/')
  }

  async function logout() {
    try { await supabaseAuth.auth.signOut() } catch {}
    if (typeof window !== 'undefined') window.location.href = '/auth'
  }

  function renderItem(item: NavItem) {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <a
        key={item.href}
        href={item.href}
        onClick={() => setDrawerOpen(false)}
        className={active ? 'adminNavItem active' : 'adminNavItem'}
        aria-current={active ? 'page' : undefined}
        title={item.hint}
      >
        <Icon size={16} strokeWidth={2} />
        <span>{item.label}</span>
      </a>
    )
  }

  return (
    <div className={`adminShell ${drawerOpen ? 'drawerOpen' : ''}`}>
      <aside className="adminSidebar">
        <div className="adminSidebarHeader">
          <BrandLogo href="/admin" variant="sidebar" subline="Internes OS" />
          <button type="button" className="adminDrawerClose" aria-label="Menü schließen" onClick={() => setDrawerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="adminNav" aria-label="Admin-Navigation">
          {NAV.map((section) => (
            <div key={section.label} className="adminNavSection">
              <div className="adminNavSectionLabel">{section.label}</div>
              {section.items.map(renderItem)}
            </div>
          ))}

          <div className="adminNavSection">
            <div className="adminNavSectionLabel">Persönlich</div>
            {PERSONAL_NAV.map(renderItem)}
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
        <button type="button" className="adminMenuBtn" aria-label="Menü öffnen" onClick={() => setDrawerOpen(true)}>
          <Menu size={22} />
        </button>
        <BrandLogo href="/admin" variant="topbar" subline="Intern" />
      </header>

      <main className="adminContent">
        {children}
      </main>

      {drawerOpen && <div className="adminDrawerOverlay" onClick={() => setDrawerOpen(false)} />}
    </div>
  )
}
