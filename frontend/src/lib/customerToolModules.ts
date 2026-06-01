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
  },
{
    key: 'monthly_report_pdf_delivery',
    title: 'Monatsreport PDF & Versand',
    shortTitle: 'Monatsreport PDF',
    category: 'reporting',
    route: '/portal/reports',
    adminRoute: '/admin/reports/monthly',
    description: 'Erzeugt Monatsreports als PDF, gibt sie im Kundenportal frei und versendet sie optional per E-Mail.',
    customerValue: 'Der Betrieb bekommt regelmaessig greifbare Ergebnisse statt nur Dashboard-Zahlen.',
    includedTools: ['Monatsreport Generator', 'PDF-Erzeugung', 'Kundenportal-Freigabe', 'Report-Mailversand', 'Dokumentencenter'],
    singlePrice: 39,
    setupFee: 79,
    packageMin: 'starter',
    recommendedFor: ['alle laufenden Kunden', 'Retainer', 'Pilotkunden', 'Reporting'],
    sourceInspiration: ['Agency Reporting', 'Vendasta Client Portal']
  },
  {
    key: 'customer_portal_pro',
    title: 'Kundenportal Pro / Portal-Backoffice Basis',
    shortTitle: 'Kundenportal Pro',
    category: 'reporting',
    route: '/portal',
    adminRoute: '/admin/tool-access-v2',
    description: 'Kundenportal mit Reports, Dokumenten, Einwilligungen, Kampagnenstatus und Freigaben.',
    customerValue: 'Der Kunde sieht transparent, was laeuft, welche Dokumente verfuegbar sind und welche Aktionen freigegeben werden muessen.',
    includedTools: ['Portal Startseite', 'Reports & PDFs', 'Consent-Uebersicht', 'Kampagnenstatus', 'Dokumentenfreigaben'],
    singlePrice: 49,
    setupFee: 99,
    packageMin: 'growth',
    recommendedFor: ['laufende Betreuung', 'Growth Kunden', 'Premium Kunden'],
    sourceInspiration: ['Vendasta Client Portal', 'Agency Client Portal']
  },
  {
    key: 'retention_intelligence_suite',
    title: 'Retention Intelligence Suite',
    shortTitle: 'Retention Intelligence',
    category: 'loyalty',
    route: '/admin/retention/intelligence',
    adminRoute: '/admin/retention/intelligence',
    description: 'Erkennt inaktive Kunden, Risiko-Kunden, VIPs, Topkunden und konkrete naechste Kundenbindungsaktionen.',
    customerValue: 'Der Betrieb sieht, welche Kunden er gerade verliert und welche Aktion als Naechstes sinnvoll ist.',
    includedTools: ['Kundensegmente', 'Inaktivitaets-Erkennung', 'Churn Score', 'Value Score', 'Reaktivierungsplan', 'VIP-Kandidaten'],
    singlePrice: 79,
    setupFee: 149,
    packageMin: 'growth',
    recommendedFor: ['Gastro', 'Beauty', 'Fitness', 'Einzelhandel', 'wiederkehrende Kunden'],
    sourceInspiration: ['CRM Segmentation', 'Retention Dashboards']
  },
  {
    key: 'customer_value_score',
    title: 'Customer Value Score',
    shortTitle: 'Customer Value Score',
    category: 'reporting',
    route: '/admin/retention/intelligence',
    adminRoute: '/admin/retention/intelligence',
    description: 'Bewertet Kunden nach Aktivitaet, Punkten, Potenzial, VIP-Faehigkeit und Bindungswert.',
    customerValue: 'Der Betrieb erkennt, welche Kunden besonders wertvoll sind und wo persoenliche Pflege sinnvoll ist.',
    includedTools: ['Value Score', 'VIP-Kandidaten', 'Topkunden-Liste', 'Segment-Auswertung', 'Empfehlungen'],
    singlePrice: 39,
    setupFee: 79,
    packageMin: 'growth',
    recommendedFor: ['Kundenbindung', 'Stammkundenpflege', 'Premium Angebote'],
    sourceInspiration: ['CRM Scoring', 'Loyalty Analytics']
  },
  {
    key: 'segment_campaigns',
    title: 'Segmentbasierte Kampagnen',
    shortTitle: 'Segment-Kampagnen',
    category: 'loyalty',
    route: '/admin/retention/intelligence',
    adminRoute: '/admin/retention/intelligence',
    description: 'Startet Kampagnen-Entwuerfe direkt aus Segmenten wie inaktive Kunden, VIPs oder kritisches Feedback.',
    customerValue: 'Aus Daten werden konkrete Kampagnen statt nur Analyse.',
    includedTools: ['Segment-Auswahl', 'Kampagnen-Entwurf', 'Coupon-Entwuerfe', 'Retention-Verknuepfung', 'Freigabeprozess'],
    singlePrice: 59,
    setupFee: 99,
    packageMin: 'growth',
    recommendedFor: ['Growth Kunden', 'Loyalty Programme', 'Reaktivierung'],
    sourceInspiration: ['GoHighLevel Campaigns', 'CRM Campaign Builder']
  },
  {
    key: 'consent_center_double_optin',
    title: 'Consent Center & Double-Opt-in Reminder',
    shortTitle: 'Consent Center',
    category: 'communication',
    route: '/marketing/consent-center',
    adminRoute: '/portal/consents',
    description: 'Verwaltet Werbeeinwilligungen, Double-Opt-in, Widerrufe, Abmeldelinks und Reminder-Freigaben.',
    customerValue: 'Der Betrieb kann Reminder und Reaktivierung rechtssicherer vorbereiten, ohne Einwilligungen manuell zu verwalten.',
    includedTools: ['Double-Opt-in', 'Abmeldelink', 'Consent-Nachweis', 'Widerruf', 'Reminder-Entwuerfe', 'Kundenportal-Ansicht'],
    singlePrice: 49,
    setupFee: 99,
    packageMin: 'growth',
    recommendedFor: ['Loyalty', 'Newsletter', 'Reminder', 'Kundenbindung'],
    sourceInspiration: ['Consent Management', 'Newsletter Double-Opt-in']
  },
  {
    key: 'churn_prevention_center',
    title: 'Churn Prevention Center',
    shortTitle: 'Churn Prevention',
    category: 'loyalty',
    route: '/admin/retention/intelligence',
    adminRoute: '/admin/retention/intelligence',
    description: 'Warnt vor abwandernden Kunden, zeigt Churn-Gruende und bereitet Rueckgewinnungsaktionen vor.',
    customerValue: 'Der Betrieb reagiert frueher, bevor Stammkunden still verschwinden.',
    includedTools: ['Churn Score', 'Risiko-Liste', 'Winback Vorschlaege', 'Reminder-Entwuerfe', 'Reaktivierungsplan'],
    singlePrice: 59,
    setupFee: 149,
    packageMin: 'premium',
    recommendedFor: ['Premium Kunden', 'starke Stammkundenbasis', 'Gastro/Beauty/Fitness'],
    sourceInspiration: ['Customer Success Health', 'Churn Prediction']
  },
  {
    key: 'feedback_action_board',
    title: 'Feedback-to-Action Board',
    shortTitle: 'Feedback-to-Action',
    category: 'reputation',
    route: '/admin/retention/intelligence',
    adminRoute: '/admin/retention/intelligence',
    description: 'Macht aus kritischem Feedback konkrete Aufgaben, Service-Recovery-Faelle und Nachfassaktionen.',
    customerValue: 'Negative Rueckmeldungen bleiben nicht liegen, sondern werden in konkrete Verbesserungen uebersetzt.',
    includedTools: ['Feedback-Auswertung', 'Action Board', 'Servicefall', 'Prioritaet', 'Nachfass-Aufgabe'],
    singlePrice: 49,
    setupFee: 99,
    packageMin: 'premium',
    recommendedFor: ['Betriebe mit vielen Bewertungen', 'Servicequalitaet', 'Reputation'],
    sourceInspiration: ['Review Management', 'Service Recovery']
  },
  {
    key: 'service_recovery_tool',
    title: 'Service Recovery Tool',
    shortTitle: 'Service Recovery',
    category: 'reputation',
    route: '/admin/retention/intelligence',
    adminRoute: '/admin/retention/intelligence',
    description: 'Erstellt Service-Recovery-Faelle aus kritischem Feedback inklusive Status, Notiz und Folgeaktion.',
    customerValue: 'Der Betrieb kann unzufriedene Kunden gezielt retten und Vertrauen wiederherstellen.',
    includedTools: ['Servicefall', 'Kulanz-/Follow-up Vorschlag', 'Status', 'Notizen', 'Feedback-Verknuepfung'],
    singlePrice: 39,
    setupFee: 79,
    packageMin: 'premium',
    recommendedFor: ['Gastro', 'Beauty', 'Dienstleister', 'Reputation Management'],
    sourceInspiration: ['Customer Service Recovery', 'Ticketing']
  },
  {
    key: 'mail_domain_consent_guard',
    title: 'Mail-Domain & Consent Guard',
    shortTitle: 'Mail & Consent Guard',
    category: 'communication',
    route: '/admin/production/mail-domain',
    adminRoute: '/admin/production/mail-domain',
    description: 'Prueft Resend, SPF, DKIM, DMARC, Testmail, Abmeldelink und Consent-Formulierung.',
    customerValue: 'Marketingmails und Reminder werden technisch sauberer vorbereitet und Zustellrisiken werden sichtbar.',
    includedTools: ['Resend Check', 'SPF/DKIM/DMARC', 'Testmail', 'Abmeldelink-Test', 'Legal Guard', 'Datenschutz-Hinweise'],
    singlePrice: 39,
    setupFee: 99,
    packageMin: 'premium',
    recommendedFor: ['Premium Kunden', 'Reminder Versand', 'Newsletter', 'Reaktivierung'],
    sourceInspiration: ['Mail Deliverability Checks', 'Consent Guard']
  },
  {
    key: 'tool_readiness_center',
    title: 'Tool-Reife 1–100 Center',
    shortTitle: 'Tool-Reife Center',
    category: 'operations',
    route: '/admin/production/tool-readiness',
    adminRoute: '/admin/production/tool-readiness',
    description: 'Bewertet jedes verkaufbare Tool von 1–100, zeigt offene Punkte und externe Live-Nachweise.',
    customerValue: 'Vor Verkauf und Go-Live ist sichtbar, welche Tools wirklich produktionsreif sind und welche nur vorbereitet sind.',
    includedTools: ['Tool Scores', 'Missing Items', 'Live Proofs', 'Markdown Export', 'Statusfilter'],
    singlePrice: 29,
    setupFee: 79,
    packageMin: 'premium',
    recommendedFor: ['Pilotkunden', 'Premium Onboarding', 'interne Qualitätssicherung'],
    sourceInspiration: ['Product Readiness Matrix', 'SaaS Launch QA']
  },
  {
    key: 'system_completeness_audit',
    title: 'System Completeness & Pilot-Readiness Audit',
    shortTitle: 'Completeness Audit',
    category: 'operations',
    route: '/admin/production/completeness-audit',
    adminRoute: '/admin/production/completeness-audit',
    description: 'Prueft zentral, welche Module live bereit sind, welche nur vorbereitet sind und welche externen Nachweise den Pilotstart blockieren.',
    customerValue: 'Vor dem Start ist transparent, ob Technik, Recht, Mail, SumUp, Reports, Portal, Rollen und Migrationen wirklich bereit sind.',
    includedTools: ['Modul-Checks', 'ENV-Checks', 'Migration-Checks', 'Live-Blocker', 'Pilot-Go-Live Checklist', 'Nachweis-Flags'],
    singlePrice: 39,
    setupFee: 99,
    packageMin: 'premium',
    recommendedFor: ['Pilotkunden', 'Premium Onboarding', 'Go-Live Vorbereitung'],
    sourceInspiration: ['Operational Readiness', 'Launch Checklist']
  },
  {
    key: 'go_live_cockpit',
    title: 'Go-Live Cockpit',
    shortTitle: 'Go-Live Cockpit',
    category: 'operations',
    route: '/admin/go-live',
    adminRoute: '/admin/go-live',
    description: 'Buendelt Kunden-Go-Live, Mail-Domain, Final Hardening, Support, Billing, Retention und Blocker.',
    customerValue: 'Vor dem Start ist sichtbar, ob ein Kunde pilotbereit ist und welche Blocker noch offen sind.',
    includedTools: ['99 Readiness', 'Mail Readiness', 'Kunden-Go-Live', 'Support Diagnose', 'Billing Check', 'Blocker-Liste'],
    singlePrice: 49,
    setupFee: 149,
    packageMin: 'premium',
    recommendedFor: ['Pilotkunden', 'Premium Onboarding', 'Go-Live Vorbereitung'],
    sourceInspiration: ['Launch Checklist', 'Operational Readiness']
  }
]

export const customerPackageComposition: CustomerPackageComposition[] = [
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 149,
    setupFee: 399,
    positioning: 'Google-Grundlage, Bewertungen, Kundenportal und monatliche Ergebnisuebersicht fuer kleine Betriebe.',
    includedModules: ['local_business_audit', 'reviews_reputation', 'dashboard_reporting', 'monthly_report_pdf_delivery']
  },
  {
    key: 'growth',
    name: 'Growth',
    monthlyPrice: 299,
    setupFee: 749,
    positioning: 'Google, Local SEO, QR-/Loyalty, Consent Center, Retention Intelligence und segmentbasierte Kampagnen.',
    includedModules: ['local_business_audit', 'google_listings_local_seo', 'reviews_reputation', 'qr_slug_loyalty_campaigns', 'dashboard_reporting', 'monthly_report_pdf_delivery', 'sumup_revenue_connection', 'customer_portal_pro', 'retention_intelligence_suite', 'customer_value_score', 'segment_campaigns', 'consent_center_double_optin']
  },
  {
    key: 'premium',
    name: 'Premium',
    monthlyPrice: 499,
    setupFee: 1199,
    positioning: 'Vollstaendiges lokales Marketing-, Kundenbindungs- und Go-Live-System mit Service Recovery, Churn Prevention, Mail Guard und Automationen.',
    includedModules: ['local_business_audit', 'google_listings_local_seo', 'reviews_reputation', 'qr_slug_loyalty_campaigns', 'booking_utilization', 'inbox_chat_communication', 'payments_vouchers', 'referral_program', 'dashboard_reporting', 'monthly_report_pdf_delivery', 'sumup_revenue_connection', 'customer_portal_pro', 'retention_intelligence_suite', 'customer_value_score', 'segment_campaigns', 'consent_center_double_optin', 'churn_prevention_center', 'feedback_action_board', 'service_recovery_tool', 'mail_domain_consent_guard', 'tool_readiness_center', 'system_completeness_audit', 'go_live_cockpit']
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
  {
    key: 'sumup_revenue_connection',
    title: 'SumUp Umsatz- & Zahlungsanbindung',
    shortTitle: 'SumUp Umsatzdaten',
    category: 'operations',
    route: '/admin/pos',
    adminRoute: '/admin/pos',
    description: 'Verbindet SumUp fuer Umsatzdaten, Transaktionsliste, Tages-/Monatsumsatz und Umsatzentwicklung. MMOS ersetzt dabei kein Kassensystem.',
    customerValue: 'Der Betrieb behaelt seine SumUp-Kasse und sieht in MMOS, welche Umsaetze, Kampagnen und Kundenaktivitaeten zusammenhaengen.',
    includedTools: ['SumUp Verbindung', 'Transaktionsimport', 'Tagesumsatz', 'Monatsumsatz', 'Umsatzentwicklung', 'manuelle Zuordnung zu QR/Termin/Loyalty'],
    singlePrice: 39,
    setupFee: 149,
    packageMin: 'growth',
    recommendedFor: ['Gastro', 'Beauty', 'Einzelhandel', 'Dienstleister mit Kartenzahlung', 'Loyalty Kunden'],
    sourceInspiration: ['SumUp Dashboard', 'POS Umsatzexport', 'Marketing Attribution']
  }
,

