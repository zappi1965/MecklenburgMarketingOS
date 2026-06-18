'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3, Bot, KeyRound, Shield, FileText,
  Star, Mail, Megaphone, AlarmClock, CreditCard, ChartLine,
  Wallet, Menu, X, LogOut, User, ScanLine, Search, Activity,
  Wrench, FileSearch, CalendarClock, Rocket, FileCode2, FileSpreadsheet, Database, Sparkles,
  BrainCircuit, Gauge, TrendingUp, Target, UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserProfile, supabaseAuth } from '@/lib/authClient'
import BrandLogo from '@/components/brand/BrandLogo'
import AdminCustomerSearch from '@/components/admin/AdminCustomerSearch'

type NavItem = { href: string; label: string; icon: any; hint?: string; action?: 'frontoffice' | 'demoCustomer' | 'demoAdmin' }
type NavSection = { label: string; items: NavItem[] }

const NEW_TOOL_NAV: NavItem[] = [
  { href: '/admin', label: 'Tool-Zentrale', icon: BarChart3, hint: 'Alle neuen Admin-Tools auf einen Blick' },
  { href: '/admin/training', label: 'Wissenstest', icon: BrainCircuit, hint: 'Quiz zu allen MMOS-Tools, Vertrieb, Datenschutz und Betrieb' },
  { href: '/admin/sales/mini-audit-generator', label: 'Mini Audit Generator', icon: FileSearch, hint: 'Google-only Mini-Audit für Akquise und Erstgespräch' },
  { href: '/admin/sales/lead-engine', label: 'Lead Engine', icon: Target, hint: 'Google-Places Lead-Suche und Akquise-Vorbereitung' },
  { href: '/admin/production', label: 'Production Readiness', icon: Activity, hint: 'Monitoring, Backups, API-Kosten und Admin-Logs' },
  { href: '/admin/production/security-core', label: 'Security Core', icon: Shield, hint: 'Tenant-Isolation, Rechte, Jobs und Migration Guard' },
  { href: '/media/report-center', label: 'Media & Reports', icon: FileText, hint: 'Interner Report- und Dokumentenbereich' }
]

const NAV: NavSection[] = [
  {
    label: 'Backoffice Start',
    items: [
      { href: '/admin', label: 'Backoffice-Zentrale', icon: BarChart3, hint: 'Zentrale Übersicht der internen Backoffice-Tools' },
      { href: '/admin/training', label: 'Wissenstest', icon: BrainCircuit, hint: 'Internes Training zu MMOS, Vertrieb, Datenschutz und Betrieb' },
      { href: '/admin/production', label: 'Production Readiness', icon: Activity, hint: 'Monitoring, Backups, API-Kosten und Admin-Logs' },
      { href: '/admin/production/completeness-audit', label: 'Completeness Audit', icon: Gauge, hint: 'Systemvollständigkeit, Pilotfähigkeit und Blocker zentral prüfen' },
      { href: '/admin/production/tool-readiness', label: 'Tool-Reife 1–100', icon: Gauge, hint: 'Produktionsreife je Tool bewerten und fehlende Punkte sehen' },
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
      { href: '/admin/sales/value-offers', label: 'Angebote', icon: FileText, hint: 'Value-Angebote aus Audit und Paketlogik' },
      { href: '/admin/reports/monthly', label: 'Monatsreports', icon: FileText, hint: 'Automatische Kundenreports als Entwurf erzeugen' }
    ]
  },
  {
    label: 'System & Sicherheit',
    items: [
      { href: '/admin/admin-profiles', label: 'Adminprofile', icon: UserPlus, hint: 'Live-Adminzugänge anlegen und verwalten' },
      { href: '/admin/security', label: 'Sicherheit & 2FA', icon: Shield },
      { href: '/admin/compliance', label: 'DSGVO-Cockpit', icon: FileText },
      { href: '/admin/api-keys', label: 'API-Keys', icon: KeyRound },
      { href: '/admin/data-quality', label: 'Datenqualität', icon: Database, hint: 'Dubletten, E-Mail-Check und Datenpflege' },
      { href: '/admin/production/global-guards', label: 'Global Guards', icon: Shield, hint: 'Public Shield, Limit Engine, Schema Doctor und Tool Access Policy' },
      { href: '/admin/production/customer-readiness', label: 'Go-Live Center', icon: Activity, hint: 'Customer Go-Live, Dokumente, Datenqualität, Mail, Booking und QR-Fixes' },
      { href: '/admin/production/final-hardening', label: 'Final Hardening', icon: Shield, hint: 'Smoke Tests, Tenant-Isolation, Jobs, Webhooks, Uploads, RBAC und Errors' },
      { href: '/admin/production/support-diagnostics', label: 'Support-Diagnose', icon: Wrench, hint: 'QR, Slug, Loyalty, Billing und Fehler je Kunde prüfen' },
      { href: '/admin/qr-campaigns/growth', label: 'QR Growth Center', icon: ScanLine, hint: 'Placement Tracking, Funnel, Empfehlungen und Druckpakete' },
      { href: '/admin/loyalty/growth-suite', label: 'Loyalty Growth Suite', icon: Sparkles, hint: 'Kampagnenkalender, VIP-Level, Coupon Wallet, Referral und ROI' },
      { href: '/admin/retention/intelligence', label: 'Retention Intelligence', icon: BrainCircuit, hint: 'Segmente, Churn, Value Score, Feedback Actions und Reaktivierung' },
      { href: '/admin/production/incident-center', label: 'Incident Center', icon: AlarmClock, hint: 'Störungen, Ursachen und Lösungen dokumentieren' },
      { href: '/admin/production/backup-restore', label: 'Backup & Restore', icon: Database, hint: 'Backup-Readiness und Restore-Test Nachweise' },
      { href: '/admin/go-live', label: 'Go-Live Cockpit', icon: Rocket, hint: 'Zentrale Pilot- und Live-Bereitschaft prüfen' },
      { href: '/admin/production/mail-domain', label: 'Mail-Domain & Consent', icon: Mail, hint: 'Resend, SPF/DKIM/DMARC, Testmail, Abmeldung und Consent-Text' },
      { href: '/admin/demo-data', label: 'Demo-Daten', icon: FileText },
      { href: '/admin/onboarding/customer-wizard', label: 'Onboarding-Wizard', icon: Rocket, hint: 'Kunden von Lead bis Live führen' }
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

const MOBILE_ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Start', icon: BarChart3 },
  { href: '/admin/sales/lead-engine', label: 'Leads', icon: Target },
  { href: '/admin/admin-profiles', label: 'Admins', icon: UserPlus },
  { href: '/admin/tools', label: 'Tools', icon: Shield },
  { href: '/admin/production', label: 'Live', icon: Activity }
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
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState('Kein Kunde gewählt')

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

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('adminDrawerLocked', drawerOpen)
    return () => document.body.classList.remove('adminDrawerLocked')
  }, [drawerOpen])

  useEffect(() => {
    function refreshContextLabel() {
      try {
        const customerId = localStorage.getItem('mmos_admin_selected_customer_id') || localStorage.getItem('mmos_customer_id') || ''
        setSelectedCustomerLabel(customerId ? `Kundenkontext aktiv · ${customerId.slice(0, 8)}…` : 'Kein Kundenkontext gewählt')
      } catch {
        setSelectedCustomerLabel('Kein Kundenkontext gewählt')
      }
    }
    refreshContextLabel()
    window.addEventListener('storage', refreshContextLabel)
    window.addEventListener('mmos:admin-customer-selected', refreshContextLabel as any)
    return () => {
      window.removeEventListener('storage', refreshContextLabel)
      window.removeEventListener('mmos:admin-customer-selected', refreshContextLabel as any)
    }
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
      <Link
        key={item.href}
        href={item.href}
        onClick={(event) => handleNavItem(item, event)}
        className={active ? 'adminNavItem active' : 'adminNavItem'}
        aria-current={active ? 'page' : undefined}
        title={item.hint}
      >
        <Icon size={16} strokeWidth={2} />
        <span>{item.label}</span>
      </Link>
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
        <div className="adminTopbarIdentity">
          <BrandLogo href="/admin" variant="topbar" subline="Intern" />
          <span className="adminTopbarContext">Backoffice</span>
          <span className={selectedCustomerLabel.startsWith('Kein') ? 'adminContextGuardChip missing' : 'adminContextGuardChip'}>{selectedCustomerLabel}</span>
        </div>
        <div className="adminTopbarSearch">
          <AdminCustomerSearch />
        </div>
      </header>

      <main className="adminContent">
        {children}
      </main>

      {drawerOpen && <div className="adminDrawerOverlay" onClick={() => setDrawerOpen(false)} />}

      <nav className="adminMobileBottomNav" aria-label="Mobile Backoffice-Navigation">
        {MOBILE_ADMIN_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : undefined} onClick={(event) => handleNavItem(item, event)} aria-current={active ? 'page' : undefined}>
              <Icon size={18} strokeWidth={2.2} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button type="button" onClick={() => setDrawerOpen(true)}>
          <Menu size={18} strokeWidth={2.2} />
          <span>Mehr</span>
        </button>
      </nav>
    </div>
  )
}
