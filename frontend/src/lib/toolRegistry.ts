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

const ADMIN_SECTION_ORDER: SectionKey[] = [
  'dashboard','crm','qr_loyalty','reviews','marketing','automation','operations','sales','growth','analytics','billing','finance','settings'
]

const CUSTOMER_SECTION_ORDER: SectionKey[] = [
  'dashboard','qr_loyalty','reviews','marketing','automation','operations','analytics','settings'
]

export const mmosToolRegistry: MmosTool[] = [
  { key: 'dashboard', label: 'Dashboard', area: 'shared', section: 'dashboard', packageMin: 'starter', route: '/dashboard', description: 'Zentrale Uebersicht mit KPIs, Aufgaben und Schnellzugriffen.', visibleToCustomer: true, icon: 'layout-dashboard', mobilePriority: 1 },
  { key: 'value_dashboard', label: 'Value Dashboard', area: 'shared', section: 'dashboard', packageMin: 'starter', route: '/value-dashboard', description: 'Zeigt Kundennutzen, Potenzial, verknuepfte Daten und erzeugt Monatsreports.', visibleToCustomer: true, icon: 'presentation' },

  { key: 'growth_command_center', label: 'Growth Command Center', area: 'shared', section: 'dashboard', packageMin: 'starter', route: '/growth-command', description: 'Zentrale Steuerung fuer alle 12 Optimierungsbereiche.', visibleToCustomer: true, icon: 'radar' },
  { key: 'seo_heatmap_pro', label: 'SEO Heatmap Pro', area: 'shared', section: 'analytics', packageMin: 'growth', route: '/analytics/seo-heatmap-pro', description: 'Rankingpunkte, Stadtteile und Handlungsempfehlungen.', visibleToCustomer: true, icon: 'map' },
  { key: 'slug_endcustomer_hub', label: 'Slug-Endkundenhub', area: 'shared', section: 'qr_loyalty', packageMin: 'growth', route: '/slug-hub', description: 'Bewertungen, Loyalty, Gutscheine, Termine und Empfehlungen auf einer Endkundenseite.', visibleToCustomer: true, icon: 'link' },
  { key: 'reputation_center', label: 'Reputation Center', area: 'shared', section: 'reviews', packageMin: 'growth', route: '/reputation-center', description: 'Review-Ziele, kritisches Feedback und Bewertungssteuerung.', visibleToCustomer: true, icon: 'star' },
  { key: 'loyalty_growth_center', label: 'Loyalty Growth', area: 'shared', section: 'qr_loyalty', packageMin: 'growth', route: '/loyalty/growth', description: 'Umsatzlogik, Wiederkehrer-Ziele und Loyalty-Wachstum.', visibleToCustomer: true, icon: 'gift' },
  { key: 'lead_audit_engine', label: 'Lead Audit Engine', area: 'admin', section: 'sales', packageMin: 'growth', route: '/admin/sales/lead-engine', description: 'Lead Scraper, Mini-Audit und Paketempfehlung.', visibleToCustomer: false, icon: 'search-check' },
  { key: 'value_offer_generator', label: 'Value Angebotsgenerator', area: 'admin', section: 'sales', packageMin: 'growth', route: '/admin/sales/value-offers', description: 'Angebote aus Value Score, Audit und Paketlogik.', visibleToCustomer: false, icon: 'file-plus' },
  { key: 'tool_access_v2', label: 'Tool-Freigaben Pro', area: 'admin', section: 'billing', packageMin: 'starter', route: '/admin/tool-access-v2', description: 'Toolzugriffe pro Kunde, Paket und Add-on.', visibleToCustomer: false, icon: 'shield' },
  { key: 'crm_customer_health_v2', label: 'CRM Customer Health', area: 'shared', section: 'crm', packageMin: 'growth', route: '/crm/customer-health', description: 'Health Score, Risiko, Upsell und offene Aktionen.', visibleToCustomer: true, icon: 'activity' },
  { key: 'automation_playbooks', label: 'Automation Playbooks', area: 'shared', section: 'automation', packageMin: 'premium', route: '/automation/playbooks', description: 'Standard-Automationen fuer Reviews, Termine, Rechnungen, SEO und Loyalty.', visibleToCustomer: true, icon: 'bot' },
  { key: 'media_report_center', label: 'Media & Report Center', area: 'shared', section: 'operations', packageMin: 'starter', route: '/media/report-center', description: 'Reports, Angebote, Rechnungen und Dateien kundengenau verknuepfen.', visibleToCustomer: true, icon: 'folder' },
  { key: 'data_quality', label: 'Datenqualitaet', area: 'admin', section: 'crm', packageMin: 'premium', route: '/admin/data-quality', description: 'Dubletten finden & zusammenfuehren, E-Mail-Validierung und KI-Antworten auf Bewertungen.', visibleToCustomer: false, icon: 'database' },


  { key: 'portal_home', label: 'Kundenportal Startseite', area: 'customer', section: 'dashboard', packageMin: 'starter', route: '/portal', description: 'Kundenseitige Startseite mit Reports, Dokumenten, Einwilligungen, Kampagnenstatus und Schnellzugriffen.', visibleToCustomer: true, icon: 'layout-dashboard', mobilePriority: 1 },
  { key: 'portal_reports', label: 'Portal Reports & PDFs', area: 'customer', section: 'operations', packageMin: 'starter', route: '/portal/reports', description: 'Freigegebene Monatsreports, PDFs, Angebote und Dokumente fuer den Kunden.', visibleToCustomer: true, icon: 'file-text', mobilePriority: 2 },
  { key: 'monthly_report_pdf_delivery', label: 'Monatsreport PDF & Versand', area: 'shared', section: 'operations', packageMin: 'starter', route: '/admin/reports/monthly', description: 'Monatsreports als PDF erzeugen, im Kundenportal freigeben und per Mail versenden.', visibleToCustomer: true, icon: 'file-text' },
  { key: 'portal_consents', label: 'Portal Einwilligungen', area: 'customer', section: 'settings', packageMin: 'growth', route: '/portal/consents', description: 'Kundenseitige Uebersicht ueber Double-Opt-in, Widerrufe und Reminder-Entwuerfe.', visibleToCustomer: true, icon: 'shield-check', mobilePriority: 5 },
  { key: 'public_consent_center', label: 'Endkunden Consent Center', area: 'shared', section: 'settings', packageMin: 'growth', route: '/marketing/consent-center', description: 'Endkunden koennen Werbeeinwilligung pruefen, Double-Opt-in erneut anfordern oder widerrufen.', visibleToCustomer: true, icon: 'mail-check' },
  { key: 'retention_intelligence_suite', label: 'Retention Intelligence Suite', area: 'shared', section: 'growth', packageMin: 'growth', route: '/admin/retention/intelligence', description: 'Segmente, Inaktivitaet, Churn Score, Value Score, VIP-Kandidaten und Reaktivierungsplaene.', visibleToCustomer: true, icon: 'brain-circuit' },
  { key: 'customer_value_score', label: 'Customer Value Score', area: 'shared', section: 'growth', packageMin: 'growth', route: '/admin/retention/intelligence', description: 'Bewertet Kunden nach Bindungswert, Aktivitaet, Punktepotenzial und VIP-Faehigkeit.', visibleToCustomer: true, icon: 'gauge' },
  { key: 'segment_campaigns', label: 'Segmentbasierte Kampagnen', area: 'shared', section: 'marketing', packageMin: 'growth', route: '/admin/retention/intelligence', description: 'Kampagnen- und Coupon-Entwuerfe direkt aus Segmenten starten.', visibleToCustomer: true, icon: 'megaphone' },
  { key: 'consent_center_double_optin', label: 'Consent Center & Double-Opt-in Reminder', area: 'shared', section: 'marketing', packageMin: 'growth', route: '/portal/consents', description: 'Werbeeinwilligung, Double-Opt-in, Abmeldelink und Reminder-Freigaben.', visibleToCustomer: true, icon: 'mail-check' },
  { key: 'churn_prevention_center', label: 'Churn Prevention Center', area: 'shared', section: 'growth', packageMin: 'premium', route: '/admin/retention/intelligence', description: 'Warnt vor abwandernden Kunden und erzeugt Winback-Vorschlaege.', visibleToCustomer: true, icon: 'activity' },
  { key: 'feedback_action_board', label: 'Feedback-to-Action Board', area: 'shared', section: 'reviews', packageMin: 'premium', route: '/admin/retention/intelligence', description: 'Kritisches Feedback wird zu Aufgaben, Servicefaellen und Nachfassaktionen.', visibleToCustomer: true, icon: 'list-checks' },
  { key: 'service_recovery_tool', label: 'Service Recovery Tool', area: 'shared', section: 'reviews', packageMin: 'premium', route: '/admin/retention/intelligence', description: 'Service-Recovery-Faelle aus kritischem Feedback inklusive Status und Folgeaktion.', visibleToCustomer: true, icon: 'life-buoy' },
  { key: 'mail_domain_consent_guard', label: 'Mail-Domain & Consent Guard', area: 'admin', section: 'operations', packageMin: 'premium', route: '/admin/production/mail-domain', description: 'Resend, SPF/DKIM/DMARC, Testmail, Abmeldelink und Consent-Formulierung pruefen.', visibleToCustomer: false, icon: 'shield-check' },
  { key: 'tool_readiness_center', label: 'Tool-Reife 1-100', area: 'admin', section: 'operations', packageMin: 'premium', route: '/admin/production/tool-readiness', description: 'Bewertet jedes verkaufbare Tool von 1-100 und zeigt fehlende Produktionsreife-Punkte.', visibleToCustomer: false, icon: 'gauge' },
  { key: 'completeness_audit', label: 'Completeness Audit', area: 'admin', section: 'operations', packageMin: 'premium', route: '/admin/production/completeness-audit', description: 'Prueft UI, API, ENV, Migrationen, Paketmatrix, Rollen, Mobile-Risiken und Pilot-Blocker zentral.', visibleToCustomer: false, icon: 'gauge' },
  { key: 'go_live_cockpit', label: 'Go-Live Cockpit', area: 'admin', section: 'operations', packageMin: 'premium', route: '/admin/go-live', description: 'Zentrale Live- und Pilotbereitschaft mit Score, Blockern und naechsten Schritten.', visibleToCustomer: false, icon: 'rocket' }
,
  { key: 'tasks', label: 'Aufgaben', area: 'shared', section: 'dashboard', packageMin: 'starter', route: '/tasks', description: 'Offene Aufgaben fuer Admin und Kunden.', visibleToCustomer: true, icon: 'check-square' },
  { key: 'customer_tool_modules', label: 'Kundentool-Module', area: 'shared', section: 'dashboard', packageMin: 'starter', route: '/tools', description: 'Uebersicht aller verkaufbaren MMOS Kundentool-Module, Paketlogik und Einzelpreise.', visibleToCustomer: true, icon: 'boxes' },
  { key: 'knowledge_center', label: 'Wissens-Center', area: 'customer', section: 'dashboard', packageMin: 'starter', route: '/portal/knowledge', description: 'Onboarding, Tutorials und FAQs fuer Kunden.', visibleToCustomer: true, icon: 'book-open' },
  { key: 'ai_business_assistant', label: 'AI Business Assistant', area: 'shared', section: 'dashboard', packageMin: 'premium', route: '/ai-assistant', description: 'Hinweise, Chancen, Risiken und Handlungsempfehlungen.', visibleToCustomer: true, icon: 'sparkles' },

  { key: 'crm', label: 'CRM / Kundenakte', area: 'admin', section: 'crm', packageMin: 'starter', route: '/admin/customers', description: 'Kundenverwaltung, Kundendaten, Timeline und Status.', visibleToCustomer: false, icon: 'users', mobilePriority: 2 },
  { key: 'tickets', label: 'Tickets', area: 'shared', section: 'crm', packageMin: 'starter', route: '/tickets', description: 'Support, Review-Eskalation und Kundenanfragen.', visibleToCustomer: true, icon: 'life-buoy' },
  { key: 'timeline', label: 'Timeline Events', area: 'shared', section: 'crm', packageMin: 'growth', route: '/timeline', description: 'Chronologische Verknuepfung aus QR, Loyalty, Reviews, Billing und Tickets.', visibleToCustomer: true, icon: 'history' },
  { key: 'customer_health', label: 'Customer Health', area: 'shared', section: 'crm', packageMin: 'premium', route: '/customer-health', description: 'Health Score, Risiken, Chancen und Warnungen.', visibleToCustomer: true, icon: 'activity' },
  { key: 'customer_intelligence', label: 'Customer Intelligence', area: 'shared', section: 'crm', packageMin: 'premium', route: '/admin/customer-intelligence', description: 'Risk Score, Upsell Score, Paketnutzung und Empfehlungen.', visibleToCustomer: true, icon: 'brain-circuit' },
  { key: 'pipeline', label: 'Pipeline', area: 'admin', section: 'crm', packageMin: 'growth', route: '/admin/pipeline', description: 'Leads, Chancen, Forecast und Upsell-Potenzial.', visibleToCustomer: false, icon: 'kanban' },

  { key: 'qr_campaigns', label: 'QR Kampagnen', area: 'shared', section: 'qr_loyalty', packageMin: 'growth', route: '/qr-campaigns', description: 'QR-Kampagnen mit Slug, Zielseite, Scans, Conversions und Tool-Verknuepfung.', visibleToCustomer: true, icon: 'qr-code', mobilePriority: 3 },
  { key: 'public_landing_page', label: 'Oeffentliche /l/[slug]', area: 'shared', section: 'qr_loyalty', packageMin: 'growth', route: '/l/[slug]', description: 'Oeffentliche Endkundenseite fuer QR, Review und Loyalty.', visibleToCustomer: true, icon: 'link' },
  { key: 'loyalty', label: 'Loyalty Programm', area: 'shared', section: 'qr_loyalty', packageMin: 'growth', route: '/loyalty', description: 'Punkteprogramm ueber QR-Code mit Kampagnenverknuepfung.', visibleToCustomer: true, icon: 'gift' },
  { key: 'loyalty_rewards', label: 'Rewards', area: 'shared', section: 'qr_loyalty', packageMin: 'growth', route: '/loyalty/rewards', description: 'Einloesbare Praemien, Rabatte, Produkte und VIP-Rewards.', visibleToCustomer: true, icon: 'badge-check' },
  { key: 'loyalty_reward_rules', label: 'Reward Regeln', area: 'shared', section: 'qr_loyalty', packageMin: 'premium', route: '/loyalty/rules', description: 'Konfiguration von Reward-Typen, Punktebedarf und Bedingungen.', visibleToCustomer: true, icon: 'sliders-horizontal' },
  { key: 'referral_program', label: 'Empfehlungsprogramm', area: 'shared', section: 'qr_loyalty', packageMin: 'premium', route: '/referrals', description: 'Empfehlungslinks, QR-Empfehlungen, Praemienlogik und Loyalty-Anbindung.', visibleToCustomer: true, icon: 'share-2' },
  { key: 'ai_social_posts', label: 'AI Social-Post-Generator', area: 'shared', section: 'marketing', packageMin: 'premium', route: '/admin/social', description: 'KI-generierte Social-Media-Posts im Markenton fuer Instagram, Facebook, Google und LinkedIn.', visibleToCustomer: true, icon: 'megaphone' },

  { key: 'reviews', label: 'Reviews', area: 'shared', section: 'reviews', packageMin: 'growth', route: '/reviews', description: 'Feedback, Bewertungsliste und Review-Funnel.', visibleToCustomer: true, icon: 'star', mobilePriority: 4 },
  { key: 'review_intelligence', label: 'Review Intelligence', area: 'shared', section: 'reviews', packageMin: 'premium', route: '/admin/review-intelligence', description: 'Sentiment, Themen, Antwortvorschlaege und Eskalation.', visibleToCustomer: true, icon: 'gauge' },
  { key: 'review_response_templates', label: 'Antwortvorlagen', area: 'shared', section: 'reviews', packageMin: 'premium', route: '/reviews/templates', description: 'Vorlagen fuer positive, neutrale und negative Bewertungen.', visibleToCustomer: true, icon: 'message-square-quote' },

  { key: 'marketing_automation', label: 'Marketing Automation', area: 'shared', section: 'marketing', packageMin: 'premium', route: '/marketing/automation', description: 'Reaktivierung, Review Booster, Loyalty-Boost und Kampagnen.', visibleToCustomer: true, icon: 'megaphone', mobilePriority: 5 },
  { key: 'reactivation', label: 'Reaktivierungs-Center', area: 'shared', section: 'marketing', packageMin: 'premium', route: '/marketing/reactivation', description: 'Kampagnen fuer inaktive Endkunden.', visibleToCustomer: true, icon: 'rotate-cw' },
  { key: 'workflow_center', label: 'Workflow Center', area: 'shared', section: 'marketing', packageMin: 'premium', route: '/marketing/workflows', description: 'Visuelle Workflow-Konfiguration.', visibleToCustomer: true, icon: 'workflow' },
  { key: 'smart_automation', label: 'Smart Automation', area: 'shared', section: 'automation', packageMin: 'premium', route: '/automation/smart', description: 'Regelbasierte Automationen aus QR, Loyalty, Reviews und Health.', visibleToCustomer: true, icon: 'bot' },
  { key: 'online_booking', label: 'Online-Terminbuchung', area: 'shared', section: 'operations', packageMin: 'starter', route: '/admin/booking', description: 'Self-Service-Buchungs-Widget mit Slot-/Verfuegbarkeitslogik und iframe-Embed.', visibleToCustomer: true, icon: 'calendar-clock' },
  { key: 'e_invoice', label: 'E-Rechnung', area: 'shared', section: 'operations', packageMin: 'growth', route: '/admin/e-invoice', description: 'XRechnung (UBL 2.1) und ZUGFeRD-Export — Pflicht im deutschen B2B.', visibleToCustomer: true, icon: 'file-code-2' },
  { key: 'accounting_export', label: 'Buchhaltungs-Export', area: 'shared', section: 'operations', packageMin: 'growth', route: '/admin/accounting', description: 'Rechnungsexport als DATEV (EXTF), lexoffice- oder sevDesk-CSV fuer den Steuerberater.', visibleToCustomer: true, icon: 'file-spreadsheet' },
  { key: 'pos_integration', label: 'Umsatz & Zahlungen (SumUp)', area: 'shared', section: 'operations', packageMin: 'growth', route: '/admin/pos', description: 'SumUp-Umsatzdaten, Transaktionen, Tages-/Monatsumsatz und Umsatzentwicklung anzeigen, ohne MMOS zur Kasse zu machen.', visibleToCustomer: true, icon: 'credit-card' },

  { key: 'booking', label: 'Booking / Termine', area: 'shared', section: 'operations', packageMin: 'starter', route: '/booking', description: 'Termine, Services, Kategorien und Umsaetze.', visibleToCustomer: true, icon: 'calendar-clock' },
  { key: 'booking_utilization', label: 'Termin- & Auslastung', area: 'shared', section: 'operations', packageMin: 'premium', route: '/booking/utilization', description: 'Online-Buchung, Erinnerungen, Warteliste, Last-Minute-Slots und Rebooking.', visibleToCustomer: true, icon: 'calendar-clock' },
  { key: 'unified_inbox', label: 'Nachrichten-Zentrale', area: 'shared', section: 'operations', packageMin: 'premium', route: '/inbox', description: 'Formular-, Website-, Slug-, Social- und Google-Anfragen in einer Inbox.', visibleToCustomer: true, icon: 'inbox' },
  { key: 'payments_vouchers', label: 'Zahlungen & Gutscheine', area: 'shared', section: 'operations', packageMin: 'premium', route: '/payments-vouchers', description: 'Zahlungslinks, Anzahlungen, Gutscheinkauf und QR-Gutschein-Einloesung.', visibleToCustomer: true, icon: 'badge-euro' },
  { key: 'appointments', label: 'Termine', area: 'admin', section: 'operations', packageMin: 'starter', route: '/admin/appointments', description: 'Detail-Verwaltung von Terminen, Status und Konflikten.', visibleToCustomer: false, icon: 'calendar-days' },
  { key: 'services', label: 'Leistungen', area: 'admin', section: 'operations', packageMin: 'starter', route: '/admin/services', description: 'Services und Preise.', visibleToCustomer: false, icon: 'tag' },
  { key: 'invoices', label: 'Rechnungen', area: 'shared', section: 'operations', packageMin: 'starter', route: '/invoices', description: 'Rechnungen, Status, PDF und Umsatzbezug.', visibleToCustomer: true, icon: 'receipt' },
  { key: 'media_center', label: 'Media Center', area: 'shared', section: 'operations', packageMin: 'starter', route: '/media', description: 'PDFs, Vertraege, Rechnungen, Bilder und Dokumente.', visibleToCustomer: true, icon: 'folder' },

  { key: 'google_business_audit', label: 'Google Business Audit', area: 'admin', section: 'sales', packageMin: 'growth', route: '/admin/sales', description: 'Vor-Ort-Audit fuer Google Business Profile.', visibleToCustomer: false, icon: 'search-check' },
  { key: 'mini_audit_generator', label: 'Mini-Audit Generator', area: 'admin', section: 'sales', packageMin: 'growth', route: '/admin/sales', description: 'Kompaktes Audit-PDF fuer Erstansprache.', visibleToCustomer: false, icon: 'file-search' },
  { key: 'lead_scraper', label: 'Lead Scraper', area: 'admin', section: 'sales', packageMin: 'premium', route: '/admin/sales', description: 'Branchen-/Standort-basierte Lead-Listen.', visibleToCustomer: false, icon: 'list-filter' },
  { key: 'offer_generator', label: 'Angebots-Generator', area: 'admin', section: 'sales', packageMin: 'growth', route: '/admin/sales', description: 'Angebote auf Basis Paket-Matrix und Audit.', visibleToCustomer: false, icon: 'file-plus' },
  { key: 'contract_generator', label: 'Vertrags-Generator', area: 'admin', section: 'sales', packageMin: 'growth', route: '/admin/sales', description: 'Dienstleistungsvertraege mit AVV-Hinweis.', visibleToCustomer: false, icon: 'file-signature' },

  { key: 'kpi_analytics', label: 'KPI Analytics', area: 'shared', section: 'analytics', packageMin: 'growth', route: '/analytics/kpis', description: 'Klicks, Impressionen, Sichtbarkeit, Leads und lokale SEO-Werte.', visibleToCustomer: true, icon: 'line-chart' },
  { key: 'seo_dashboard', label: 'SEO Dashboard', area: 'shared', section: 'analytics', packageMin: 'growth', route: '/analytics/seo', description: 'SEO-Wachstum, Sichtbarkeit und lokale Performance.', visibleToCustomer: true, icon: 'bar-chart-3' },
  { key: 'seo_heatmap', label: 'SEO Heatmap', area: 'shared', section: 'analytics', packageMin: 'growth', route: '/analytics/seo-heatmap', description: 'Lokale Suchradius-Heatmap und Karten-Sichtbarkeit.', visibleToCustomer: true, icon: 'map' },
  { key: 'listing_management', label: 'Listings / Branchenbuch', area: 'shared', section: 'analytics', packageMin: 'growth', route: '/analytics/listings', description: 'NAP-Daten, Google, Apple Maps, Bing, Facebook und Branchenbuch-Konsistenz pruefen.', visibleToCustomer: true, icon: 'map-pinned' },
  { key: 'integrations', label: 'Integrationen', area: 'shared', section: 'analytics', packageMin: 'starter', route: '/integrations', description: 'Google, Stripe, PayPal und weitere Verbindungen.', visibleToCustomer: true, icon: 'plug' },
  { key: 'competitor_comparison', label: 'Wettbewerber-Vergleich', area: 'shared', section: 'analytics', packageMin: 'premium', route: '/analytics/competitors', description: 'Sichtbarkeit gegen Wettbewerber im lokalen Markt.', visibleToCustomer: true, icon: 'swords' },

  { key: 'package_matrix', label: 'Paket-Matrix', area: 'admin', section: 'billing', packageMin: 'starter', route: '/admin/packages', description: 'Paketlogik, Tool-Zugriffe und Feature-Matrix.', visibleToCustomer: false, icon: 'layers-3' },
  { key: 'tool_module_catalog', label: 'Tool-Modul-Katalog', area: 'admin', section: 'billing', packageMin: 'starter', route: '/admin/tools', description: 'Admin-Uebersicht fuer Kundentool-Module, Add-ons, Paketzuordnung und Einzelpreise.', visibleToCustomer: false, icon: 'boxes' },
  { key: 'tool_access', label: 'Tool-Freigaben', area: 'admin', section: 'billing', packageMin: 'starter', route: '/admin/tool-access', description: 'Freigaben pro Kunde und Tool.', visibleToCustomer: false, icon: 'shield' },
  { key: 'subscriptions', label: 'Abonnements', area: 'admin', section: 'billing', packageMin: 'starter', route: '/admin/subscriptions', description: 'Stripe-/PayPal-Subscriptions.', visibleToCustomer: false, icon: 'repeat' },

  { key: 'revenue_forecasting', label: 'Revenue Forecasting', area: 'admin', section: 'finance', packageMin: 'premium', route: '/admin/revenue-forecast', description: 'MRR, Pipeline, Forecast, Churn Risk und Umsatztreiber.', visibleToCustomer: false, icon: 'trending-up' },
  { key: 'dunning_center', label: 'Mahnwesen', area: 'admin', section: 'finance', packageMin: 'starter', route: '/admin/dunning', description: 'Mahnstufen, Eskalation und Forderungsverfolgung.', visibleToCustomer: false, icon: 'mail-warning' },
  { key: 'health_center', label: 'System Health', area: 'admin', section: 'finance', packageMin: 'starter', route: '/admin/health', description: 'Live-Status der Backend-/Integrations-Health.', visibleToCustomer: false, icon: 'heart-pulse' },
  { key: 'demo_data_center', label: 'Demo-Daten', area: 'admin', section: 'settings', packageMin: 'starter', route: '/admin/demo-data', description: 'Demo-Daten fuer neue Kundentools auffuellen und pruefen.', visibleToCustomer: false, icon: 'database' },

  { key: 'users', label: 'Benutzer', area: 'admin', section: 'settings', packageMin: 'starter', route: '/admin/users', description: 'Admins, Mitarbeitende und Rollen.', visibleToCustomer: false, icon: 'user-cog' },
  { key: 'branding', label: 'Branding', area: 'shared', section: 'settings', packageMin: 'starter', route: '/settings/branding', description: 'Logo, Farben, Schriftarten und Tonalitaet.', visibleToCustomer: true, icon: 'palette' },
  { key: 'api_keys', label: 'API Keys', area: 'admin', section: 'settings', packageMin: 'premium', route: '/admin/api-keys', description: 'Eigene API-Keys und Webhook-Konfiguration.', visibleToCustomer: false, icon: 'key' },
  { key: 'profile', label: 'Profil', area: 'customer', section: 'settings', packageMin: 'starter', route: '/portal/profile', description: 'Persoenliche Daten, Login, Praeferenzen.', visibleToCustomer: true, icon: 'user' },
  { key: 'privacy_self_service', label: 'Meine Datenrechte', area: 'shared', section: 'settings', packageMin: 'starter', route: '/privacy/me', description: 'Auskunfts- und Loeschanfragen gemaess Art. 15 + 17 DSGVO.', visibleToCustomer: true, icon: 'shield-check' }
]

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

export function getMobileBottomNav(packageKey: string = 'starter', area: 'admin' | 'customer' = 'customer'): ToolSection[] {
  const sections = area === 'admin' ? getAdminNavigation(packageKey) : getCustomerNavigation(packageKey)
  return sections
    .map((s) => ({ section: s, prio: s.tools.reduce((acc, t) => Math.min(acc, t.mobilePriority ?? 99), 99) }))
    .filter((r) => r.prio < 99)
    .sort((a, b) => a.prio - b.prio)
    .slice(0, 5)
    .map((r) => r.section)
}

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
