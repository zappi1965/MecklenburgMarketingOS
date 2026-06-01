git pull

node - <<'NODE'
const fs = require('fs')
const path = require('path')

const root = process.cwd()

function p(rel) {
  return path.join(root, rel)
}

function exists(rel) {
  return fs.existsSync(p(rel))
}

function read(rel) {
  return fs.readFileSync(p(rel), 'utf8')
}

function write(rel, content) {
  fs.mkdirSync(path.dirname(p(rel)), { recursive: true })
  fs.writeFileSync(p(rel), content, 'utf8')
}

function replaceFile(rel, fn) {
  if (!exists(rel)) return
  const before = read(rel)
  const after = fn(before)
  if (after !== before) write(rel, after)
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

/**
 * 1. Doppelte Backoffice-Seitenleiste entfernen
 * /admin/layout.tsx rendert bereits AdminShell.
 */
const adminPages = walk(p('frontend/src/app/admin')).filter((file) => file.endsWith('/page.tsx'))

for (const file of adminPages) {
  let txt = fs.readFileSync(file, 'utf8')
  if (!txt.includes('AdminShell')) continue

  txt = txt.replace("import AdminShell from '@/components/AdminShell'\n", '')
  txt = txt.replace(/<AdminShell(?:\s+activeHref="[^"]+")?>/g, '<>')
  txt = txt.replace(/<\/AdminShell>/g, '</>')

  fs.writeFileSync(file, txt, 'utf8')
}

/**
 * 2. Authentifizierte API-Requests für geschützte neue Tools
 */
write('frontend/src/lib/authenticatedApiRequest.ts', `import { apiRequest, type ApiRequestOptions } from './apiRequest'
import { getCurrentSession } from './authClient'

export async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert: Bitte mit einem echten Admin-/Kundenkonto anmelden. Lokale Demo-Rolle reicht für geschützte Backend-Tools nicht aus.')
  }
  return { Authorization: \`Bearer \${session.access_token}\` }
}

export async function authenticatedApiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = { ...(options.headers || {}), ...(await authHeaders()) }
  return apiRequest<T>(url, { ...options, headers })
}

export async function authenticatedDownload(url: string, fallbackName = 'download.md') {
  const headers = await authHeaders()
  const res = await fetch(url, { headers, cache: 'no-store' })
  if (!res.ok) {
    let msg = \`Download fehlgeschlagen (\${res.status})\`
    try {
      const payload = await res.json()
      msg = payload?.error || payload?.message || msg
    } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  const cd = res.headers.get('content-disposition') || ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const name = match?.[1] || fallbackName
  const blob = new Blob([text], { type: res.headers.get('content-type') || 'text/plain;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}
`)

const protectedClients = [
  'frontend/src/lib/completenessAuditClient.ts',
  'frontend/src/lib/toolReadinessClient.ts',
  'frontend/src/lib/goLiveCockpitClient.ts',
  'frontend/src/lib/mailDomainComplianceClient.ts',
  'frontend/src/lib/operationsClient.ts',
  'frontend/src/lib/retentionIntelligenceClient.ts',
  'frontend/src/lib/qrCampaignGrowthClient.ts',
  'frontend/src/lib/loyaltyGrowthSuiteClient.ts'
]

for (const rel of protectedClients) {
  replaceFile(rel, (txt) => {
    if (!txt.includes('authenticatedApiRequest')) {
      txt = txt.replace(
        "import { apiRequest } from './apiRequest'\n",
        "import { authenticatedApiRequest } from './authenticatedApiRequest'\n"
      )
      txt = txt.replace(/\bapiRequest\(/g, 'authenticatedApiRequest(')
    }
    return txt
  })
}

/**
 * 3. Tool Readiness Markdown Export authentifizieren
 */
replaceFile('frontend/src/lib/toolReadinessClient.ts', (txt) => {
  txt = txt.replace(
    "import { authenticatedApiRequest } from './authenticatedApiRequest'\n",
    "import { authenticatedApiRequest, authenticatedDownload } from './authenticatedApiRequest'\n"
  )

  txt = txt.replace(
    "markdownUrl: () => `${base}/export.md`",
    "downloadMarkdown: () => authenticatedDownload(`${base}/export.md`, 'mmos-tool-produktionsreife.md')"
  )

  return txt
})

replaceFile('frontend/src/app/admin/production/tool-readiness/page.tsx', (txt) => {
  txt = txt.replace(
    '<a className="btn secondary" href={toolReadinessClient.markdownUrl()}>Markdown Export</a>',
    '<button className="btn secondary" onClick={() => toolReadinessClient.downloadMarkdown().catch((e:any)=>setMsg(e?.message || "Export fehlgeschlagen."))}>Markdown Export</button>'
  )
  return txt
})

/**
 * 4. Tool Registry: Frontoffice/Backoffice Routen trennen
 */
replaceFile('frontend/src/lib/toolRegistry.ts', (txt) => {
  if (!txt.includes('adminRoute?: string')) {
    txt = txt.replace(
      '  route?: string\n  description: string',
      '  route?: string\n  adminRoute?: string\n  customerRoute?: string\n  description: string'
    )
  }

  const oldBlock = `function buildSections(orderedSections: SectionKey[], filter: (t: MmosTool) => boolean): ToolSection[] {
  const sections: ToolSection[] = []
  for (const sectionKey of orderedSections) {
    const tools = mmosToolRegistry.filter((t) => t.section === sectionKey && filter(t))
    if (tools.length === 0) continue
    sections.push({ ...sectionMeta[sectionKey], tools })
  }
  return sections
}

export function getAdminNavigation(packageKey: string = 'premium'): ToolSection[] {
  return buildSections(ADMIN_SECTION_ORDER, (t) => {
    if (t.area === 'customer') return false
    return PACKAGE_LEVEL[(packageKey || 'premium').toLowerCase() as PackageTier] >= PACKAGE_LEVEL[t.packageMin]
  })
}

export function getCustomerNavigation(packageKey: string = 'starter'): ToolSection[] {
  return buildSections(CUSTOMER_SECTION_ORDER, (t) => {
    if (!t.visibleToCustomer) return false
    return PACKAGE_LEVEL[(packageKey || 'starter').toLowerCase() as PackageTier] >= PACKAGE_LEVEL[t.packageMin]
  })
}`

  const newBlock = `function toolForContext(t: MmosTool, context: 'admin' | 'customer'): MmosTool {
  if (context === 'admin') return { ...t, route: t.adminRoute || t.route }
  return { ...t, route: t.customerRoute || t.route }
}

function buildSections(orderedSections: SectionKey[], filter: (t: MmosTool) => boolean, context: 'admin' | 'customer'): ToolSection[] {
  const sections: ToolSection[] = []
  for (const sectionKey of orderedSections) {
    const tools = mmosToolRegistry
      .filter((t) => t.section === sectionKey && filter(t))
      .map((t) => toolForContext(t, context))
    if (tools.length === 0) continue
    sections.push({ ...sectionMeta[sectionKey], tools })
  }
  return sections
}

export function getAdminNavigation(packageKey: string = 'premium'): ToolSection[] {
  return buildSections(ADMIN_SECTION_ORDER, (t) => {
    if (t.area === 'customer') return false
    return PACKAGE_LEVEL[(packageKey || 'premium').toLowerCase() as PackageTier] >= PACKAGE_LEVEL[t.packageMin]
  }, 'admin')
}

export function getCustomerNavigation(packageKey: string = 'starter'): ToolSection[] {
  return buildSections(CUSTOMER_SECTION_ORDER, (t) => {
    if (!t.visibleToCustomer) return false
    return PACKAGE_LEVEL[(packageKey || 'starter').toLowerCase() as PackageTier] >= PACKAGE_LEVEL[t.packageMin]
  }, 'customer')
}`

  if (txt.includes(oldBlock)) {
    txt = txt.replace(oldBlock, newBlock)
  }

  const routeOverrides = {
    monthly_report_pdf_delivery: ['/admin/reports/monthly', '/portal/reports'],
    retention_intelligence_suite: ['/admin/retention/intelligence', '/portal/campaigns'],
    customer_value_score: ['/admin/retention/intelligence', '/portal/dashboard'],
    segment_campaigns: ['/admin/retention/intelligence', '/portal/campaigns'],
    churn_prevention_center: ['/admin/retention/intelligence', '/portal/campaigns'],
    feedback_action_board: ['/admin/retention/intelligence', '/portal/reviews'],
    service_recovery_tool: ['/admin/retention/intelligence', '/portal/reviews'],
    customer_intelligence: ['/admin/customer-intelligence', '/portal/dashboard'],
    ai_social_posts: ['/admin/social', '/portal/campaigns'],
    review_intelligence: ['/admin/review-intelligence', '/portal/reviews'],
    online_booking: ['/admin/booking', '/portal/settings'],
    e_invoice: ['/admin/e-invoice', '/portal/billing'],
    accounting_export: ['/admin/accounting', '/portal/billing'],
    pos_integration: ['/admin/pos', '/portal/billing'],
    sumup_revenue_connection: ['/admin/pos', '/portal/billing']
  }

  for (const [key, routes] of Object.entries(routeOverrides)) {
    const [adminRoute, customerRoute] = routes
    const regex = new RegExp(`(\\{ key: '${key}'[\\s\\S]*?route: ')[^']+('[\\s\\S]*?\\})`)
    txt = txt.replace(regex, (match, before, after) => {
      let item = before + adminRoute + after
      item = item.replace(/,?\\s*adminRoute: '[^']+'/g, '')
      item = item.replace(/,?\\s*customerRoute: '[^']+'/g, '')
      item = item.replace(
        `route: '${adminRoute}'`,
        `route: '${adminRoute}', adminRoute: '${adminRoute}', customerRoute: '${customerRoute}'`
      )
      return item
    })
  }

  return txt
})

/**
 * 5. Kundenportal-Navigation sauber auf Frontoffice setzen
 */
write('frontend/src/components/portal/CustomerPortalShell.tsx', `'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, FileText, QrCode, Star, User, LogOut, Gift, Megaphone, ShieldCheck, Receipt, Settings, Users } from 'lucide-react'
import { getCurrentUserProfile, supabaseAuth } from '@/lib/authClient'
import { CustomerOrAdminOnly } from '@/components/security/RoleGate'
import { customerVisibleToolsForPackage } from '@/lib/toolRegistry'
import BrandLogo from '@/components/brand/BrandLogo'

const BASE_NAV = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: BarChart3, toolKeys: ['dashboard', 'customer_portal_pro', 'portal_home'] },
  { href: '/portal/reports', label: 'Reports & PDFs', icon: FileText, toolKeys: ['portal_reports', 'monthly_report_pdf_delivery', 'dashboard_reporting', 'media_center'] },
  { href: '/portal/qr-campaigns', label: 'QR-Kampagnen', icon: QrCode, toolKeys: ['qr_campaigns', 'qr_slug_loyalty_campaigns', 'public_landing_page'] },
  { href: '/portal/loyalty', label: 'Loyalty', icon: Gift, toolKeys: ['loyalty', 'loyalty_growth_center', 'loyalty_rewards', 'retention_intelligence_suite'] },
  { href: '/portal/reviews', label: 'Reviews', icon: Star, toolKeys: ['reviews', 'reviews_reputation', 'review_intelligence', 'feedback_action_board', 'service_recovery_tool'] },
  { href: '/portal/campaigns', label: 'Kampagnen', icon: Megaphone, toolKeys: ['segment_campaigns', 'marketing_automation', 'churn_prevention_center', 'ai_social_posts'] },
  { href: '/portal/consents', label: 'Einwilligungen', icon: ShieldCheck, toolKeys: ['portal_consents', 'consent_center_double_optin', 'public_consent_center'] },
  { href: '/portal/billing', label: 'Paket & Billing', icon: Receipt, toolKeys: ['e_invoice', 'accounting_export', 'pos_integration', 'sumup_revenue_connection', 'invoices'] },
  { href: '/portal/settings', label: 'Einstellungen', icon: Settings, toolKeys: ['branding', 'online_booking', 'profile'] },
  { href: '/portal/team', label: 'Team', icon: Users, toolKeys: ['profile', 'customer_portal_pro'] },
  { href: '/portal/profile', label: 'Profil', icon: User, toolKeys: ['profile'] }
]

export default function CustomerPortalShell({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    setCurrentPath(window.location.pathname)
    getCurrentUserProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const allowedToolKeys = useMemo(() => new Set(
    customerVisibleToolsForPackage(profile?.package_name || profile?.package || profile?.tier || 'starter')
      .map((tool) => tool.key)
  ), [profile])

  async function logout() {
    try { await supabaseAuth.auth.signOut() } catch {}
    if (typeof window !== 'undefined') window.location.href = '/auth'
  }

  return (
    <CustomerOrAdminOnly>
      <div className="adminShell">
        <aside className="adminSidebar">
          <div className="adminSidebarHeader">
            <BrandLogo href="/portal/dashboard" variant="sidebar" subline="Kundenbereich" />
          </div>
          <nav className="adminNav" aria-label="Kunden-Navigation">
            <div className="adminNavSection">
              <div className="adminNavSectionLabel">Frontoffice / Kundenbereich</div>
              {BASE_NAV.filter((item) => item.href === '/portal/profile' || item.toolKeys.some((key) => allowedToolKeys.has(key))).map((item) => {
                const Icon = item.icon
                const active = currentPath === item.href || currentPath.startsWith(item.href + '/')
                return (
                  <a key={item.href} href={item.href} className={active ? 'adminNavItem active' : 'adminNavItem'} aria-current={active ? 'page' : undefined}>
                    <Icon size={16} strokeWidth={2} />
                    <span>{item.label}</span>
                  </a>
                )
              })}
            </div>
          </nav>
          <div className="adminSidebarFooter">
            <button type="button" className="adminLogout" onClick={logout}><LogOut size={14} /> Logout</button>
          </div>
        </aside>
        <main className="adminContent">{children}</main>
      </div>
    </CustomerOrAdminOnly>
  )
}
`)

/**
 * 6. Backoffice nicht mehr direkt auf Portal-Reports verlinken
 */
replaceFile('frontend/src/components/AdminShell.tsx', (txt) => {
  return txt.replace(
    "  { href: '/media/report-center', label: 'Media & Reports', icon: FileText, hint: 'Interner Report- und Dokumentenbereich' },\n  { href: '/portal/reports', label: 'Kundenportal Reports', icon: FileText, hint: 'Kundenansicht für freigegebene PDFs und Reports' }\n",
    "  { href: '/media/report-center', label: 'Media & Reports', icon: FileText, hint: 'Interner Report- und Dokumentenbereich' }\n"
  )
})

replaceFile('frontend/src/app/admin/page.tsx', (txt) => {
  return txt.replace(
    "href: '/portal/reports',\n    title: 'Kundenportal Reports',\n    eyebrow: 'Portal',\n    icon: FileText,\n    text: 'Ansicht der freigegebenen Reports und PDFs aus Kundensicht.'",
    "href: '/admin/reports/monthly',\n    title: 'Monatsreports & PDF-Versand',\n    eyebrow: 'Reporting',\n    icon: FileText,\n    text: 'Reports erzeugen, als PDF speichern und fuer Kunden bereitstellen.'"
  )
})

console.log('MMOS Auth/Nav/Frontoffice-Backoffice Patch angewendet.')
NODE
