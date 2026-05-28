export type PackageTier = 'starter' | 'growth' | 'premium'

export type CustomerToolModule = {
  key: string
  title: string
  shortTitle: string
  category: 'visibility' | 'reputation' | 'loyalty' | 'operations' | 'communication' | 'sales' | 'reporting'
  route: string
  adminRoute?: string
  description: string
  customerValue: string
  includedTools: string[]
  singlePrice: number
  setupFee: number
  packageMin: PackageTier
  recommendedFor: string[]
  sourceInspiration?: string[]
}

export type CustomerPackageComposition = {
  key: PackageTier
  name: string
  monthlyPrice: number
  setupFee: number
  positioning: string
  includedModules: string[]
}

export const customerToolModules: CustomerToolModule[] = [
  {
    key: 'local_business_audit',
    title: 'Local Business Audit / Digitaler Sichtbarkeits-Check',
    shortTitle: 'Local Business Audit',
    category: 'sales',
    route: '/admin/sales/gbp-audit',
    adminRoute: '/admin/sales/gbp-audit',
    description: 'Prueft Google Business, Bewertungen, lokale SEO-Sichtbarkeit, Website/Slug, Social-Aktivitaet, Wettbewerber und konkrete Optimierungschancen.',
    customerValue: 'Der Betrieb sieht schwarz auf weiss, wo aktuell Sichtbarkeit, Vertrauen und Anfragen verloren gehen und welche Massnahmen sich zuerst lohnen.',
    includedTools: ['Google Business Audit', 'Mini-Audit Generator', 'SEO Heatmap Basis', 'Wettbewerber-Vergleich', 'PDF-/Dashboard-Report'],
    singlePrice: 49,
    setupFee: 0,
    packageMin: 'starter',
    recommendedFor: ['alle lokalen Betriebe', 'Akquise', 'Erstgespraech', 'Paketberatung'],
    sourceInspiration: ['Vendasta Snapshot Report', 'BrightLocal Audit']
  },
  {
    key: 'google_listings_local_seo',
    title: 'Google Sichtbarkeit & Listings inkl. SEO Heatmap',
    shortTitle: 'Google & Listings',
    category: 'visibility',
    route: '/analytics/listings',
    adminRoute: '/analytics/listings',
    description: 'Buendelt Google Business Optimierung, lokale Keyword-Auswertung, SEO Heatmap, Wettbewerbervergleich und konsistente Online-Eintraege.',
    customerValue: 'Der Betrieb wird lokal besser gefunden und erkennt, in welchen Stadtteilen oder Suchbereichen er sichtbar ist und wo Konkurrenz staerker ist.',
    includedTools: ['Google Business Profil', 'SEO Dashboard', 'SEO Heatmap', 'Keyword Tracking', 'Wettbewerber-Vergleich', 'Listings/NAP-Check'],
    singlePrice: 79,
    setupFee: 199,
    packageMin: 'growth',
    recommendedFor: ['Handwerker', 'Beauty', 'Gastro', 'Dienstleister', 'Praxen', 'Autowerkstatt'],
    sourceInspiration: ['BrightLocal', 'Local Falcon', 'Yext', 'Uberall']
  },
  {
    key: 'reviews_reputation',
    title: 'Bewertungen & Reputation',
    shortTitle: 'Reviews & Reputation',
    category: 'reputation',
    route: '/reviews',
    adminRoute: '/reviews',
    description: 'Sammelt neue Bewertungen, leitet gute Bewertungen zu Google weiter und faengt kritisches Feedback intern ab.',
    customerValue: 'Mehr Vertrauen bei neuen Kunden, weniger oeffentliche Negativbewertungen und schnellere Reaktion auf Kritik.',
    includedTools: ['Review QR', 'Review Funnel', 'Reputation Shield', 'Antwortvorlagen', 'AI Review Antworten', 'Ticket-Eskalation'],
    singlePrice: 49,
    setupFee: 99,
    packageMin: 'starter',
    recommendedFor: ['alle Betriebe mit Kundenkontakt', 'Gastro', 'Friseur', 'Kosmetik', 'Handwerk'],
    sourceInspiration: ['Birdeye', 'GoHighLevel', 'Thryv']
  },
  {
    key: 'qr_slug_loyalty_campaigns',
    title: 'QR- & Slug-Marketing inkl. Loyalty & Kampagnen',
    shortTitle: 'QR & Slug Marketing',
    category: 'loyalty',
    route: '/qr-campaigns',
    adminRoute: '/qr-campaigns',
    description: 'Verbindet individuelle Slug-Seite, QR-Codes, Loyalty/Punkte, digitale Stempelkarte, Gutscheine, Rewards und Kampagnen-Auswertung.',
    customerValue: 'Der QR-Code fuehrt immer auf eine konkrete Aktionsseite: bewerten, Punkte sammeln, Gutschein einloesen, Aktion ansehen oder Kontakt aufnehmen.',
    includedTools: ['Slug-Seite', 'QR-Kampagnen', 'Loyalty Programm', 'Rewards', 'Reward Regeln', 'Kampagnen-Auswertung'],
    singlePrice: 69,
    setupFee: 199,
    packageMin: 'growth',
    recommendedFor: ['Cafe', 'Imbiss', 'Friseur', 'Kosmetik', 'Fitness', 'Einzelhandel'],
    sourceInspiration: ['Shore App', 'Treatwell Rebooking', 'klassische digitale Kundenkarte']
  },
  {
    key: 'booking_utilization',
    title: 'Termin- & Auslastungssystem',
    shortTitle: 'Termine & Auslastung',
    category: 'operations',
    route: '/booking/utilization',
    adminRoute: '/booking/utilization',
    description: 'Erweitert Terminverwaltung um Online-Buchung, freie Slots, automatische Erinnerungen, Warteliste, Last-Minute-Slots und Rebooking-Erinnerungen.',
    customerValue: 'Weniger Telefonaufwand, weniger No-Shows und bessere Auslastung freier Zeiten.',
    includedTools: ['Online-Terminbuchung', 'Terminerinnerungen', 'No-Show-Reduzierung', 'Warteliste', 'Last-Minute-Slots', 'Rebooking'],
    singlePrice: 69,
    setupFee: 249,
    packageMin: 'premium',
    recommendedFor: ['Friseur', 'Kosmetik', 'Massage', 'Beratung', 'Werkstatt', 'Praxis-nahe Dienstleister'],
    sourceInspiration: ['Shore', 'Treatwell', 'Thryv', 'GoHighLevel']
  },
  {
    key: 'inbox_chat_communication',
    title: 'Nachrichten-Zentrale & Lead-Chat',
    shortTitle: 'Inbox & Chat',
    category: 'communication',
    route: '/inbox',
    adminRoute: '/inbox',
    description: 'Buendelt Formularanfragen, Website/Slug-Chat, Social-/Google-Anfragen, Vorlagen, Status und interne Notizen in einer Inbox.',
    customerValue: 'Anfragen gehen nicht mehr zwischen Telefon, Mail, Social Media und Formularen verloren.',
    includedTools: ['Unified Inbox', 'Website-/Slug-Chat', 'Vorlagen', 'Lead-Status', 'interne Notizen', 'Follow-up Aufgaben'],
    singlePrice: 49,
    setupFee: 149,
    packageMin: 'premium',
    recommendedFor: ['Handwerker', 'Dienstleister', 'Gastro', 'Betriebe mit vielen Anfragen'],
    sourceInspiration: ['Birdeye Messaging', 'Thryv Inbox', 'GoHighLevel Conversations']
  },
  {
    key: 'payments_vouchers',
    title: 'Zahlungs- & Gutscheinmodul',
    shortTitle: 'Payments & Gutscheine',
    category: 'sales',
    route: '/payments-vouchers',
    adminRoute: '/payments-vouchers',
    description: 'Ermoeglicht Zahlungslinks, Anzahlungen, Online-Gutscheine, QR-Gutschein-Einloesung und Zahlungserinnerungen ueber externe Payment-Anbieter.',
    customerValue: 'Der Betrieb kann Anzahlungen sichern, Gutscheine verkaufen und offene Zahlungen einfacher nachfassen, ohne eine eigene Kasse zu ersetzen.',
    includedTools: ['Zahlungslink', 'Anzahlung', 'Gutscheinkauf', 'QR-Einloesung', 'Zahlungserinnerung', 'Stripe/PayPal/SumUp Vorbereitung'],
    singlePrice: 49,
    setupFee: 149,
    packageMin: 'premium',
    recommendedFor: ['Beauty', 'Gastro', 'Events', 'Dienstleister', 'Werkstatt'],
    sourceInspiration: ['Thryv Payments', 'Birdeye Payments', 'GoHighLevel Invoicing']
  },
  {
    key: 'referral_program',
    title: 'Empfehlungsprogramm',
    shortTitle: 'Empfehlungen',
    category: 'loyalty',
    route: '/referrals',
    adminRoute: '/referrals',
    description: 'Erzeugt Empfehlungslinks oder QR-Codes, trackt Weiterempfehlungen und verbindet Praemien mit Loyalty oder Gutscheinen.',
    customerValue: 'Zufriedene Kunden bringen neue Kunden, ohne dass der Betrieb selbst dauerhaft Werbung schalten muss.',
    includedTools: ['Empfehlungslink', 'QR-Empfehlung', 'Praemienlogik', 'Tracking', 'Loyalty-Anbindung'],
    singlePrice: 39,
    setupFee: 99,
    packageMin: 'premium',
    recommendedFor: ['Friseur', 'Kosmetik', 'Fitness', 'Handwerk', 'Coaching', 'lokale Dienstleister'],
    sourceInspiration: ['Birdeye Referrals', 'Thryv Referrals']
  },
  {
    key: 'dashboard_reporting',
    title: 'Kundenportal, Dashboard & Monatsreport',
    shortTitle: 'Dashboard & Reporting',
    category: 'reporting',
    route: '/dashboard',
    adminRoute: '/dashboard',
    description: 'Zeigt Kennzahlen, Ergebnisse, Reports, Dateien, Freigaben und naechste Schritte im Kundenportal.',
    customerValue: 'Der Kunde erkennt, was gemacht wurde, welche Ergebnisse entstanden sind und welche Massnahmen als Naechstes sinnvoll sind.',
    includedTools: ['Kundenportal', 'Dashboard', 'Monatsreport', 'KPI Analytics', 'Dateien', 'Freigaben'],
    singlePrice: 29,
    setupFee: 79,
    packageMin: 'starter',
    recommendedFor: ['alle laufenden Kunden', 'Pakete', 'Retainer'],
    sourceInspiration: ['Vendasta Client Portal', 'Agency Reporting']
  }
]

export const customerPackageComposition: CustomerPackageComposition[] = [
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 149,
    setupFee: 399,
    positioning: 'Google-Grundlage, Bewertungen und sichtbare Ergebnisse fuer kleine Betriebe.',
    includedModules: ['local_business_audit', 'reviews_reputation', 'dashboard_reporting']
  },
  {
    key: 'growth',
    name: 'Growth',
    monthlyPrice: 299,
    setupFee: 749,
    positioning: 'Google, Local SEO, SEO Heatmap, QR-/Slug-Marketing, Loyalty und Kampagnen.',
    includedModules: ['local_business_audit', 'google_listings_local_seo', 'reviews_reputation', 'qr_slug_loyalty_campaigns', 'dashboard_reporting']
  },
  {
    key: 'premium',
    name: 'Premium',
    monthlyPrice: 499,
    setupFee: 1199,
    positioning: 'Vollstaendiges lokales Marketing- und Betriebs-System mit Termin, Inbox, Payments und Automationen.',
    includedModules: ['local_business_audit', 'google_listings_local_seo', 'reviews_reputation', 'qr_slug_loyalty_campaigns', 'booking_utilization', 'inbox_chat_communication', 'payments_vouchers', 'referral_program', 'dashboard_reporting']
  }
]

export function moduleByKey(key: string) {
  return customerToolModules.find((m) => m.key === key)
}

export function modulesForPackage(packageKey: PackageTier | string) {
  const pkg = customerPackageComposition.find((p) => p.key === packageKey) || customerPackageComposition[0]
  return pkg.includedModules.map(moduleByKey).filter(Boolean) as CustomerToolModule[]
}

export function singleModuleValue(packageKey: PackageTier | string) {
  return modulesForPackage(packageKey).reduce((sum, m) => sum + m.singlePrice, 0)
}
