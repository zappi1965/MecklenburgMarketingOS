// Single Source of Truth fuer alle Tools/Module und davon abgeleitete
// Admin- und Customer-Navigation, Paket-Matrix und Mobile-Bottom-Nav.
//
// Die vorherigen drei Quellen (admin-navigation.json, customer-navigation.json,
// mobileNavigationConfig.ts) waren nicht synchron und haben Inkonsistenzen bei
// Tool-Keys (qr-campaigns vs qr_campaigns) und sogar doppelte Sektionen
// produziert. Hier ist jetzt alles in einer Datei mit einheitlichem snake_case.

export type ToolArea = 'admin' | 'customer' | 'shared'
export type PackageTier = 'starter' | 'growth' | 'premium'
export type SectionKey =
  | 'dashboard'
  | 'crm'
  | 'marketing'
  | 'reviews'
  | 'qr_loyalty'
  | 'automation'
  | 'operations'
  | 'growth'
  | 'sales'
  | 'billing'
  | 'finance'
  | 'analytics'
  | 'settings'

export type MmosTool = {
  key: string
  label: string
  area: ToolArea
  section: SectionKey
  packageMin: PackageTier
  route?: string
  description: string
  visibleToCustomer: boolean
  icon?: string
  // Lower number = higher priority on mobile bottom nav (1..5). 99 = hide on mobile bottom nav.
  mobilePriority?: number
}

export type SectionMeta = {
  key: SectionKey
  label: string
  icon: string
}

export const sectionMeta: Record<SectionKey, SectionMeta> = {
  dashboard:  { key: 'dashboard',  label: 'Dashboard',         icon: 'layout-dashboard' },
  crm:        { key: 'crm',        label: 'Kunden',            icon: 'users' },
  marketing:  { key: 'marketing',  label: 'Marketing',         icon: 'megaphone' },
  reviews:    { key: 'reviews',    label: 'Reviews',           icon: 'star' },
  qr_loyalty: { key: 'qr_loyalty', label: 'QR & Loyalty',      icon: 'qr-code' },
  automation: { key: 'automation', label: 'Automation',        icon: 'bot' },
  operations: { key: 'operations', label: 'Betrieb',           icon: 'calendar-clock' },
  growth:     { key: 'growth',     label: 'Wachstum',          icon: 'trending-up' },
  sales:      { key: 'sales',      label: 'Sales & Akquise',   icon: 'target' },
  billing:    { key: 'billing',    label: 'Pakete & Billing',  icon: 'credit-card' },
  finance:    { key: 'finance',    label: 'Finanzen',          icon: 'wallet' },
  analytics:  { key: 'analytics',  label: 'SEO & Analytics',   icon: 'line-chart' },
  settings:   { key: 'settings',   label: 'Einstellungen',     icon: 'settings' }
}

// Reihenfolge bestimmt die Sektions-Reihenfolge in der Sidebar.
const ADMIN_SECTION_ORDER: SectionKey[] = [
  'dashboard',
  'crm',
  'qr_loyalty',
  'reviews',
  'marketing',
  'automation',
  'operations',
  'sales',
  'growth',
  'analytics',
  'billing',
  'finance',
  'settings'
]

const CUSTOMER_SECTION_ORDER: SectionKey[] = [
  'dashboard',
  'qr_loyalty',
  'reviews',
  'marketing',
  'automation',
  'operations',
  'analytics',
  'settings'
]

export const mmosToolRegistry: MmosTool[] = [
  // Dashboard
  { key: 'dashboard',                  label: 'Dashboard',                area: 'shared',   section: 'dashboard',  packageMin: 'starter', route: '/dashboard',                  description: 'Zentrale Uebersicht mit KPIs, Aufgaben und Schnellzugriffen.',                                  visibleToCustomer: true,  icon: 'layout-dashboard', mobilePriority: 1 },
  { key: 'tasks',                      label: 'Aufgaben',                 area: 'shared',   section: 'dashboard',  packageMin: 'starter', route: '/tasks',                      description: 'Offene Aufgaben fuer Admin und Kunden.',                                                        visibleToCustomer: true,  icon: 'check-square' },
  { key: 'ai_alerts',                  label: 'AI Alerts',                area: 'admin',    section: 'dashboard',  packageMin: 'premium', route: '/admin/alerts',                description: 'Auffaelligkeiten und Empfehlungen aus AI Pipeline.',                                            visibleToCustomer: false, icon: 'bell-ring' },
  { key: 'ai_business_assistant',      label: 'AI Business Assistant',    area: 'shared',   section: 'dashboard',  packageMin: 'premium', route: '/ai-assistant',                description: 'Hinweise, Chancen, Risiken und Handlungsempfehlungen.',                                         visibleToCustomer: true,  icon: 'sparkles' },
  { key: 'knowledge_center',           label: 'Wissens-Center',           area: 'customer', section: 'dashboard',  packageMin: 'starter', route: '/portal/knowledge',            description: 'Onboarding, Tutorials und FAQs fuer Kunden.',                                                   visibleToCustomer: true,  icon: 'book-open' },

  // CRM
  { key: 'crm',                        label: 'CRM / Kundenakte',         area: 'admin',    section: 'crm',        packageMin: 'starter', route: '/admin/customers',             description: 'Kundenverwaltung, Kundendaten, Timeline und Status.',                                           visibleToCustomer: false, icon: 'users',            mobilePriority: 2 },
  { key: 'customer_health',            label: 'Customer Health',          area: 'shared',   section: 'crm',        packageMin: 'premium', route: '/customer-health',             description: 'Health Score, Risiken, Chancen und Warnungen.',                                                 visibleToCustomer: true,  icon: 'activity' },
  { key: 'customer_intelligence',      label: 'Customer Intelligence',    area: 'shared',   section: 'crm',        packageMin: 'premium', route: '/customer-intelligence',       description: 'Risk Score, Upsell Score, Paketnutzung und Empfehlungen.',                                      visibleToCustomer: true,  icon: 'brain-circuit' },
  { key: 'timeline',                   label: 'Timeline Events',          area: 'shared',   section: 'crm',        packageMin: 'growth',  route: '/timeline',                    description: 'Chronologische Verknuepfung aus QR, Loyalty, Reviews, Billing und Tickets.',                    visibleToCustomer: true,  icon: 'history' },
  { key: 'tickets',                    label: 'Tickets',                  area: 'shared',   section: 'crm',        packageMin: 'starter', route: '/tickets',                     description: 'Support, Review-Eskalation und Kundenanfragen.',                                                visibleToCustomer: true,  icon: 'life-buoy' },
  { key: 'pipeline',                   label: 'Pipeline',                 area: 'admin',    section: 'crm',        packageMin: 'growth',  route: '/admin/pipeline',              description: 'Leads, Chancen, Forecast und Upsell-Potenzial.',                                                visibleToCustomer: false, icon: 'kanban' },

  // QR & Loyalty
  { key: 'qr_campaigns',               label: 'QR Kampagnen',             area: 'shared',   section: 'qr_loyalty', packageMin: 'growth',  route: '/qr-campaigns',                description: 'QR-Kampagnen mit Slug, Zielseite, Scans, Conversions und Tool-Verknuepfung.',                   visibleToCustomer: true,  icon: 'qr-code',          mobilePriority: 3 },
  { key: 'public_landing_page',        label: 'Oeffentliche /l/[slug]',   area: 'shared',   section: 'qr_loyalty', packageMin: 'growth',  route: '/l/[slug]',                    description: 'Oeffentliche Endkundenseite fuer QR, Review und Loyalty.',                                      visibleToCustomer: true,  icon: 'link' },
  { key: 'loyalty',                    label: 'Loyalty Programm',         area: 'shared',   section: 'qr_loyalty', packageMin: 'growth',  route: '/loyalty',                     description: 'Punkteprogramm ueber QR-Code mit nachtraeglicher Kampagnenverknuepfung.',                        visibleToCustomer: true,  icon: 'gift' },
  { key: 'loyalty_rewards',            label: 'Rewards',                  area: 'shared',   section: 'qr_loyalty', packageMin: 'growth',  route: '/loyalty/rewards',             description: 'Einloesbare Praemien, Rabatte, Produkte und VIP-Rewards.',                                      visibleToCustomer: true,  icon: 'badge-check' },
  { key: 'loyalty_reward_rules',       label: 'Reward Regeln',            area: 'shared',   section: 'qr_loyalty', packageMin: 'premium', route: '/loyalty/rules',               description: 'Konfiguration von Reward-Typen, Punktebedarf und Bedingungen.',                                 visibleToCustomer: true,  icon: 'sliders-horizontal' },
  { key: 'staff_confirmation_codes',   label: 'Mitarbeitercode',          area: 'shared',   section: 'qr_loyalty', packageMin: 'premium', route: '/loyalty/staff-codes',         description: 'Mitarbeiter bestaetigen Reward-Einloesungen per Code.',                                         visibleToCustomer: true,  icon: 'shield-check' },
  { key: 'loyalty_segments',           label: 'Loyalty Segmente',         area: 'shared',   section: 'qr_loyalty', packageMin: 'premium', route: '/loyalty/segments',            description: 'VIP, inaktiv, reward-ready und review-aktive Endkunden.',                                       visibleToCustomer: true,  icon: 'layers' },
  { key: 'smart_loyalty',              label: 'Smart Loyalty',            area: 'shared',   section: 'qr_loyalty', packageMin: 'premium', route: '/loyalty/smart',               description: 'VIP-Level, Multiplikatoren, Punkte-Regeln und Smart Actions.',                                  visibleToCustomer: true,  icon: 'wand-2' },
  { key: 'landingpage_texts',          label: 'Landingpage-Texte',        area: 'shared',   section: 'qr_loyalty', packageMin: 'growth',  route: '/loyalty/landingpage-texts',   description: 'Texte und Branding fuer die oeffentliche Slug-Seite.',
    visibleToCustomer: true,  icon: 'file-text' },

  // Reviews
  { key: 'reviews',                    label: 'Reviews',                  area: 'shared',   section: 'reviews',    packageMin: 'growth',  route: '/reviews',                     description: 'Feedback, Bewertungsliste und Review-Funnel.',                                                  visibleToCustomer: true,  icon: 'star',             mobilePriority: 4 },
  { key: 'review_intelligence',        label: 'Review Intelligence',      area: 'shared',   section: 'reviews',    packageMin: 'premium', route: '/reviews/intelligence',        description: 'Sentiment, Themen, Antwortvorschlaege und Eskalation.',                                         visibleToCustomer: true,  icon: 'gauge' },
  { key: 'review_response_templates',  label: 'Antwortvorlagen',          area: 'shared',   section: 'reviews',    packageMin: 'premium', route: '/reviews/templates',           description: 'Vorlagen fuer positive, neutrale und negative Bewertungen.',                                    visibleToCustomer: true,  icon: 'message-square-quote' },
  { key: 'review_topics',              label: 'Themen-Analyse',           area: 'admin',    section: 'reviews',    packageMin: 'premium', route: '/admin/reviews/topics',        description: 'Auto-getaggte Themen aus Reviews mit Trend ueber Zeit.',                                        visibleToCustomer: false, icon: 'tags' },
  { key: 'review_ticket_escalations',  label: 'Ticket-Eskalation',        area: 'admin',    section: 'reviews',    packageMin: 'growth',  route: '/admin/reviews/escalations',   description: 'Negative Reviews werden in Tickets eskaliert.',                                                 visibleToCustomer: false, icon: 'alert-triangle' },

  // Marketing
  { key: 'marketing_automation',       label: 'Marketing Automation',     area: 'shared',   section: 'marketing',  packageMin: 'premium', route: '/marketing/automation',        description: 'Reaktivierung, Review Booster, Loyalty-Boost und Kampagnen.',                                   visibleToCustomer: true,  icon: 'megaphone',        mobilePriority: 5 },
  { key: 'reactivation',               label: 'Reaktivierungs-Center',    area: 'shared',   section: 'marketing',  packageMin: 'premium', route: '/marketing/reactivation',      description: 'Kampagnen fuer inaktive Endkunden.',                                                            visibleToCustomer: true,  icon: 'rotate-cw' },
  { key: 'review_booster',             label: 'Review Booster',           area: 'shared',   section: 'marketing',  packageMin: 'premium', route: '/marketing/review-booster',    description: 'Gezielte Anstoesse fuer mehr Bewertungen.',                                                     visibleToCustomer: true,  icon: 'thumbs-up' },
  { key: 'workflow_center',            label: 'Workflow Center',          area: 'shared',   section: 'marketing',  packageMin: 'premium', route: '/marketing/workflows',         description: 'Visuelle Workflow-Konfiguration.',                                                              visibleToCustomer: true,  icon: 'workflow' },

  // Automation
  { key: 'smart_automation',           label: 'Smart Automation',         area: 'shared',   section: 'automation', packageMin: 'premium', route: '/automation/smart',            description: 'Regelbasierte Automationen aus QR, Loyalty, Reviews und Health.',                               visibleToCustomer: true,  icon: 'bot' },

  // Operations
  { key: 'booking',                    label: 'Booking / Termine',        area: 'shared',   section: 'operations', packageMin: 'starter', route: '/booking',                     description: 'Termine, Services, Kategorien und Umsaetze.',                                                   visibleToCustomer: true,  icon: 'calendar-clock' },
  { key: 'appointments',               label: 'Termine',                  area: 'admin',    section: 'operations', packageMin: 'starter', route: '/admin/appointments',          description: 'Detail-Verwaltung von Terminen, Status und Konflikten.',                                        visibleToCustomer: false, icon: 'calendar-days' },
  { key: 'services',                   label: 'Leistungen',               area: 'admin',    section: 'operations', packageMin: 'starter', route: '/admin/services',              description: 'Services und Preise.',                                                                          visibleToCustomer: false, icon: 'tag' },
  { key: 'invoices',                   label: 'Rechnungen',               area: 'shared',   section: 'operations', packageMin: 'starter', route: '/invoices',                    description: 'Rechnungen, Status, PDF und Umsatzbezug.',                                                      visibleToCustomer: true,  icon: 'receipt' },
  { key: 'media_center',               label: 'Media Center',             area: 'shared',   section: 'operations', packageMin: 'starter', route: '/media',                       description: 'PDFs, Vertraege, Rechnungen, Bilder und Dokumente.',                                            visibleToCustomer: true,  icon: 'folder' },

  // Sales & Akquise (admin-only)
  { key: 'google_business_audit',      label: 'Google Business Audit',    area: 'admin',    section: 'sales',      packageMin: 'growth',  route: '/admin/sales/gbp-audit',       description: 'Vor-Ort-Audit fuer Google Business Profile.',                                                   visibleToCustomer: false, icon: 'search-check' },
  { key: 'mini_audit_generator',       label: 'Mini-Audit Generator',     area: 'admin',    section: 'sales',      packageMin: 'growth',  route: '/admin/sales/mini-audit',      description: 'Kompaktes Audit-PDF fuer Erstansprache.',                                                       visibleToCustomer: false, icon: 'file-search' },
  { key: 'lead_scraper',               label: 'Lead Scraper',             area: 'admin',    section: 'sales',      packageMin: 'premium', route: '/admin/sales/leads',           description: 'Branchen-/Standort-basierte Lead-Listen.',                                                      visibleToCustomer: false, icon: 'list-filter' },
  { key: 'acquisition_campaign_center',label: 'Akquise Campaign Center',  area: 'admin',    section: 'sales',      packageMin: 'premium', route: '/admin/sales/campaigns',       description: 'E-Mail-Sequenzen fuer Akquise.',                                                                visibleToCustomer: false, icon: 'send' },
  { key: 'offer_generator',            label: 'Angebots-Generator',       area: 'admin',    section: 'sales',      packageMin: 'growth',  route: '/admin/sales/offers',          description: 'Angebote auf Basis Paket-Matrix und Audit.',                                                    visibleToCustomer: false, icon: 'file-plus' },
  { key: 'contract_generator',         label: 'Vertrags-Generator',       area: 'admin',    section: 'sales',      packageMin: 'growth',  route: '/admin/sales/contracts',       description: 'Dienstleistungsvertraege mit AVV-Hinweis.',                                                     visibleToCustomer: false, icon: 'file-signature' },

  // Growth / Analytics
  { key: 'kpi_analytics',              label: 'KPI Analytics',            area: 'shared',   section: 'analytics',  packageMin: 'growth',  route: '/analytics/kpis',              description: 'Klicks, Impressionen, Sichtbarkeit, Leads und lokale SEO-Werte.',                               visibleToCustomer: true,  icon: 'line-chart' },
  { key: 'seo_dashboard',              label: 'SEO Dashboard',            area: 'shared',   section: 'analytics',  packageMin: 'growth',  route: '/analytics/seo',               description: 'SEO-Wachstum, Sichtbarkeit und lokale Performance.',                                            visibleToCustomer: true,  icon: 'bar-chart-3' },
  { key: 'seo_heatmap',                label: 'SEO Heatmap',              area: 'shared',   section: 'analytics',  packageMin: 'growth',  route: '/analytics/seo-heatmap',       description: 'Lokale Suchradius-Heatmap und Karten-Sichtbarkeit.',                                            visibleToCustomer: true,  icon: 'map' },
  { key: 'integrations',               label: 'Integrationen',            area: 'shared',   section: 'analytics',  packageMin: 'starter', route: '/integrations',                description: 'Google, Stripe, PayPal und weitere Verbindungen.',                                              visibleToCustomer: true,  icon: 'plug' },
  { key: 'competitor_comparison',      label: 'Wettbewerber-Vergleich',   area: 'shared',   section: 'analytics',  packageMin: 'premium', route: '/analytics/competitors',       description: 'Sichtbarkeit gegen Wettbewerber im lokalen Markt.',                                             visibleToCustomer: true,  icon: 'swords' },

  // Billing & Revenue
  { key: 'package_matrix',             label: 'Paket-Matrix',             area: 'admin',    section: 'billing',    packageMin: 'starter', route: '/admin/packages',              description: 'Paketlogik, Tool-Zugriffe und Feature-Matrix.',                                                 visibleToCustomer: false, icon: 'layers-3' },
  { key: 'tool_access',                label: 'Tool-Freigaben',           area: 'admin',    section: 'billing',    packageMin: 'starter', route: '/admin/tool-access',           description: 'Freigaben pro Kunde und Tool.',                                                                 visibleToCustomer: false, icon: 'shield' },
  { key: 'subscriptions',              label: 'Abonnements',              area: 'admin',    section: 'billing',    packageMin: 'starter', route: '/admin/subscriptions',         description: 'Stripe-/PayPal-Subscriptions.',                                                                 visibleToCustomer: false, icon: 'repeat' },
  { key: 'dynamic_billing',            label: 'Dynamic Billing',          area: 'admin',    section: 'billing',    packageMin: 'premium', route: '/admin/dynamic-billing',       description: 'Usage-basierte Zusatzabrechnung aus QR, AI, Reviews und Automationen.',                         visibleToCustomer: false, icon: 'gauge' },
  { key: 'revenue_share',              label: 'Revenue Share',            area: 'admin',    section: 'billing',    packageMin: 'premium', route: '/admin/revenue-share',         description: 'Prozentuale Weitergabe, Stripe-Connect-Vorbereitung und Abrechnungslogik.',                     visibleToCustomer: false, icon: 'split' },
  { key: 'package_recommendations',    label: 'Package Recommendations',  area: 'admin',    section: 'billing',    packageMin: 'premium', route: '/admin/package-recommendations', description: 'Upgrade-, Add-on- und Risikoempfehlungen aus Nutzungsdaten.',                                 visibleToCustomer: false, icon: 'arrow-up-right' },

  // Finance
  { key: 'revenue_forecasting',        label: 'Revenue Forecasting',      area: 'admin',    section: 'finance',    packageMin: 'premium', route: '/admin/revenue-forecasting',   description: 'MRR, Pipeline, Forecast, Churn Risk und Umsatztreiber.',                                        visibleToCustomer: false, icon: 'trending-up' },
  { key: 'customer_success_traffic',   label: 'Customer Success Ampel',   area: 'admin',    section: 'finance',    packageMin: 'premium', route: '/admin/cs-traffic-light',      description: 'Ampel-Sicht auf Customer-Health, Churn und Up-Sell-Potenzial.',                                 visibleToCustomer: false, icon: 'traffic-cone' },
  { key: 'dunning_center',             label: 'Mahnwesen',                area: 'admin',    section: 'finance',    packageMin: 'starter', route: '/admin/dunning',               description: 'Mahnstufen, Eskalation und Forderungsverfolgung.',                                              visibleToCustomer: false, icon: 'mail-warning' },
  { key: 'health_center',              label: 'System Health',            area: 'admin',    section: 'finance',    packageMin: 'starter', route: '/admin/health',                description: 'Live-Status der Backend-/Integrations-Health.',                                                 visibleToCustomer: false, icon: 'heart-pulse' },

  // Settings
  { key: 'users',                      label: 'Benutzer',                 area: 'admin',    section: 'settings',   packageMin: 'starter', route: '/admin/users',                 description: 'Admins, Mitarbeitende und Rollen.',                                                             visibleToCustomer: false, icon: 'user-cog' },
  { key: 'branding',                   label: 'Branding',                 area: 'shared',   section: 'settings',   packageMin: 'starter', route: '/settings/branding',           description: 'Logo, Farben, Schriftarten und Tonalitaet.',                                                    visibleToCustomer: true,  icon: 'palette' },
  { key: 'api_keys',                   label: 'API Keys',                 area: 'admin',    section: 'settings',   packageMin: 'premium', route: '/admin/api-keys',              description: 'Eigene API-Keys und Webhook-Konfiguration.',                                                    visibleToCustomer: false, icon: 'key' },
  { key: 'profile',                    label: 'Profil',                   area: 'customer', section: 'settings',   packageMin: 'starter', route: '/portal/profile',              description: 'Persoenliche Daten, Login, Praeferenzen.',                                                      visibleToCustomer: true,  icon: 'user' },
  { key: 'privacy_self_service',       label: 'Meine Datenrechte',        area: 'shared',   section: 'settings',   packageMin: 'starter', route: '/privacy/me',                  description: 'Auskunfts- und Loeschanfragen gemaess Art. 15 + 17 DSGVO.',                                     visibleToCustomer: true,  icon: 'shield-check' }
]

// Map Tool-Keys → Tool fuer schnellen Lookup.
export const toolByKey: Record<string, MmosTool> = Object.fromEntries(
  mmosToolRegistry.map((t) => [t.key, t])
)

export function findTool(key: string): MmosTool | undefined {
  return toolByKey[key]
}

const PACKAGE_LEVEL: Record<PackageTier, number> = { starter: 1, growth: 2, premium: 3 }

export function toolsForPackage(packageKey: string): MmosTool[] {
  const level = PACKAGE_LEVEL[(packageKey || 'starter').toLowerCase() as PackageTier] || 1
  return mmosToolRegistry.filter((t) => level >= (PACKAGE_LEVEL[t.packageMin] || 1))
}

export function customerVisibleToolsForPackage(packageKey: string): MmosTool[] {
  return toolsForPackage(packageKey).filter((t) => t.visibleToCustomer)
}

export type ToolSection = SectionMeta & { tools: MmosTool[] }

function buildSections(orderedSections: SectionKey[], filter: (t: MmosTool) => boolean): ToolSection[] {
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
}

// Mobile-Bottom-Nav: maximal 5 Sektionen mit der niedrigsten mobilePriority.
// Eine Sektion erbt die niedrigste mobilePriority aller ihrer (sichtbaren) Tools.
export function getMobileBottomNav(packageKey: string = 'starter', area: 'admin' | 'customer' = 'customer'): ToolSection[] {
  const sections = area === 'admin' ? getAdminNavigation(packageKey) : getCustomerNavigation(packageKey)
  const ranked = sections
    .map((s) => {
      const minPrio = s.tools.reduce((acc, t) => Math.min(acc, t.mobilePriority ?? 99), 99)
      return { section: s, prio: minPrio }
    })
    .filter((r) => r.prio < 99)
    .sort((a, b) => a.prio - b.prio)
    .slice(0, 5)
    .map((r) => r.section)
  return ranked
}

// Backwards-compatibility: die alten Section-Arrays werden weiterhin
// exportiert, damit Konsumenten der alten API nicht brechen. Die Quelle
// ist jetzt aber die SSoT-Registry.
export const adminToolSections = getAdminNavigation('premium').map((s) => ({
  key: s.key,
  label: s.label,
  icon: s.icon,
  tools: s.tools.map((t) => t.key)
}))

export const customerToolSections = getCustomerNavigation('premium').map((s) => ({
  key: s.key,
  label: s.label,
  icon: s.icon,
  tools: s.tools.map((t) => t.key)
}))
