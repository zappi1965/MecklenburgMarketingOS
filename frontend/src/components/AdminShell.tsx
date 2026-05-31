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

type NavItem = { href: string; label: string; icon: any; hint?: string; action?: 'frontoffice' | 'demoCustomer' | 'demoAdmin' }
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
    label: 'Backoffice Start',
    items: [
      { href: '/admin', label: 'Backoffice-Zentrale', icon: BarChart3, hint: 'Zentrale Übersicht der internen Backoffice-Tools' },
      { href: '/admin/training', label: 'Wissenstest', icon: BrainCircuit, hint: 'Internes Training zu MMOS, Vertrieb, Datenschutz und Betrieb' },
      { href: '/admin/production', label: 'Production Readiness', icon: Activity, hint: 'Monitoring, Backups, API-Kosten und Admin-Logs' },
      { href: '/admin/production/security-core', label: 'Security Core', icon: Shield, hint: 'Tenant-Isolation, Rechte, Jobs und Systemstatus' },
      { href: '/?app=1&view=dashboard', label: 'Zum Frontoffice', icon: BarChart3, hint: 'Öffnet das Frontoffice-Dashboard ohne Logout', action: 'frontoffice' },
      { href: '/?app=1&demo=customer', label: 'Demo-Kundenumgebung', icon: User, hint: 'Öffnet die Demo-Kundensicht im Frontoffice', action: 'demoCustomer' },
      { href: '/?app=1&demo=admin', label: 'Demo-Admin', icon: Rocket, hint: 'Öffnet die interne Demo-Admin-Umgebung', action: 'demoAdmin' }
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
    label: 'Pakete & Freigaben',
    items: [
      { href: '/admin/tools', label: 'Pakete & Kundentools', icon: Megaphone, hint: 'Verkaufbare Module, Add-ons und Paketlogik' },
      { href: '/admin/tool-access-v2', label: 'Tool-Freigaben Pro', icon: Shield, hint: 'Freischaltungen pro Kunde und Paket' },
      { href: '/admin/sales/value-offers', label: 'Angebote', icon: FileText, hint: 'Value-Angebote aus Audit und Paketlogik' }
    ]
  },
  {
    label: 'System & Sicherheit',
    items: [
      { href: '/admin/security', label: 'Sicherheit & 2FA', icon: Shield },
      { href: '/admin/compliance', label: 'DSGVO-Cockpit', icon: FileText },
      { href: '/admin/api-keys', label: 'API-Keys', icon: KeyRound },
      { href: '/admin/data-quality', label: 'Datenqualität', icon: Database, hint: 'Dubletten, E-Mail-Check und Datenpflege' },
      { href: '/admin/demo-data', label: 'Demo-Daten', icon: FileText }
    ]
  },
  {
    label: 'Backoffice-Akquise',
    items: [
      { href: '/admin/sales', label: 'Sales-Werkzeuge', icon: Target },
      { href: '/admin/sales/lead-engine', label: 'Lead Engine', icon: Target },
      { href: '/admin/sales/mini-audit-generator', label: 'Mini Audit Generator', icon: FileSearch }
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
    getCurrentUserProfile().then((p) => {
      setProfile(p)
      try {
        if (p) {
          localStorage.setItem('mmos_role', String(p.role || 'admin').toLowerCase())
          if (p.customer_id) localStorage.setItem('mmos_customer_id', p.customer_id)
          sessionStorage.setItem('mmos_profile_cache_v1', JSON.stringify({ profile: p, expiresAt: Date.now() + 1000 * 60 * 10 }))
        }
      } catch {}
    }).catch(() => setProfile(null))
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

  function handleNavItem(item: NavItem, event: any) {
    if (typeof window === 'undefined') return
    if (item.action === 'frontoffice') {
      event.preventDefault()
      try {
        localStorage.setItem('mmos_mode', 'live')
        localStorage.setItem('mmos_role', 'admin')
        localStorage.setItem('mmos_frontoffice_view', 'dashboard')
        sessionStorage.removeItem('mmos_profile_cache_v1')
      } catch {}
      window.location.href = '/?app=1&view=dashboard'
      return
    }
    if (item.action === 'demoCustomer') {
      event.preventDefault()
      try {
        localStorage.setItem('mmos_mode', 'demo')
        localStorage.setItem('mmos_role', 'customer')
        localStorage.setItem('mmos_frontoffice_view', 'dashboard')
        sessionStorage.removeItem('mmos_profile_cache_v1')
      } catch {}
      window.location.href = '/?app=1&demo=customer&view=dashboard'
      return
    }
    if (item.action === 'demoAdmin') {
      event.preventDefault()
      try {
        localStorage.setItem('mmos_mode', 'demo')
        localStorage.setItem('mmos_role', 'admin')
        localStorage.setItem('mmos_frontoffice_view', 'dashboard')
        sessionStorage.removeItem('mmos_profile_cache_v1')
      } catch {}
      window.location.href = '/?app=1&demo=admin&view=dashboard'
      return
    }
    setDrawerOpen(false)
  }

  function renderItem(item: NavItem) {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <a
        key={item.href}
        href={item.href}
        onClick={(event) => handleNavItem(item, event)}
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
