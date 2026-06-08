const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../../..')

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

function read(rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8') }
  catch (_) { return '' }
}

function env(name) {
  return Boolean(String(process.env[name] || '').trim())
}

function flag(name) {
  return String(process.env[name] || '').toLowerCase() === 'true'
}

const TOOL_READINESS = [
  {
    key: 'local_business_audit',
    name: 'Local Business Audit',
    score: 88,
    category: 'Akquise',
    status: 'pilot_ready',
    missing: [
      'Echte Google-/Live-Daten sauber anbinden.',
      'Audit-Bewertungen mit echten Branchen-Benchmarks validieren.',
      'PDF-/PPTX-Export final auf Fehler prüfen.',
      'Automatische Screenshots/Nachweise integrieren.',
      'Audit-Logik pro Branche final definieren.'
    ],
    checks: [
      { key:'ui', label:'Mini-Audit UI vorhanden', ok: exists('frontend/src/app/admin/sales/mini-audit-generator/page.tsx') },
      { key:'package', label:'Paketmatrix enthält Audit', ok: read('frontend/src/lib/customerToolModules.ts').includes('local_business_audit') },
      { key:'sales', label:'Sales-Verknüpfung vorhanden', ok: exists('frontend/src/app/admin/sales/lead-engine/page.tsx') },
      { key:'live_google', label:'Google-Live-Daten bewiesen', ok: flag('MMOS_GOOGLE_LIVE_DATA_GREEN'), external:true }
    ]
  },
  {
    key: 'google_listings_local_seo',
    name: 'Google & Listings / Local SEO',
    score: 72,
    category: 'Sichtbarkeit',
    status: 'prepared',
    missing: [
      'Google Business Profil API live anbinden.',
      'Google Maps/Places/Search Daten zuverlässig abrufen.',
      'SEO Heatmap mit echten Standortdaten testen.',
      'NAP-Konsistenz über echte Quellen prüfen.',
      'Ranking-Entwicklung historisch speichern.',
      'Fehlerfälle bei fehlender Google-Verbindung sauber behandeln.'
    ],
    checks: [
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('google_listings_local_seo') },
      { key:'registry', label:'SEO/Analytics in Registry vorhanden', ok: read('frontend/src/lib/toolRegistry.ts').includes('seo_dashboard') },
      { key:'google_env', label:'Google API Key gesetzt', ok: env('GOOGLE_API_KEY') || env('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'), external:true },
      { key:'live_proof', label:'Local SEO Live-Proof vorhanden', ok: flag('MMOS_GOOGLE_LISTINGS_LIVE_GREEN'), external:true }
    ]
  },
  {
    key: 'reviews_reputation',
    name: 'Reviews & Reputation',
    score: 86,
    category: 'Reputation',
    status: 'pilot_ready',
    missing: [
      'Echten Google-Bewertungslink je Kunde hinterlegen.',
      'Review-Funnel mit echten Endkunden testen.',
      'Kritisches Feedback zuverlässig intern speichern.',
      'Eskalation zu Ticket/Aufgabe finalisieren.',
      'Antwortvorlagen rechtlich/tonal prüfen.',
      'AI-Antworten mit Freigabeprozess absichern.'
    ],
    checks: [
      { key:'ui', label:'Reviews/Review Intelligence vorhanden', ok: exists('frontend/src/app/admin/review-intelligence/page.tsx') || read('frontend/src/lib/toolRegistry.ts').includes('review_intelligence') },
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('reviews_reputation') },
      { key:'slug', label:'Slug/Review Funnel vorhanden', ok: exists('frontend/src/app/l/[slug]/page.tsx') },
      { key:'live_review', label:'Google Review Flow live getestet', ok: flag('MMOS_REVIEW_FLOW_GREEN'), external:true }
    ]
  },
  {
    key: 'qr_slug_loyalty_campaigns',
    name: 'QR & Slug Marketing / Loyalty',
    score: 90,
    category: 'Loyalty',
    status: 'ready_candidate',
    missing: [
      'Echte QR-Codes physisch testen.',
      'Mehrfaches Scannen/Missbrauchsschutz im Pilotbetrieb beobachten.',
      'Reward-Einlösung komplett mit Pilotkunden durchspielen.',
      'Loyalty-Punktehistorie für Kunde und Endkunde sauber sichtbar machen.',
      'Druckvorlagen für QR-Aufsteller/Sticker finalisieren.',
      'Fallbacks bei schlechtem Netz oder mehrfacher Nutzung prüfen.'
    ],
    checks: [
      { key:'qr_route', label:'/q/[slug] vorhanden', ok: exists('frontend/src/app/q/[slug]/page.tsx') },
      { key:'slug_route', label:'/l/[slug] vorhanden', ok: exists('frontend/src/app/l/[slug]/page.tsx') },
      { key:'backend', label:'QR/Loyalty Backend vorhanden', ok: exists('backend/src/routes/qrRoutes.js') && exists('backend/src/routes/loyaltyGrowthSuiteRoutes.js') },
      { key:'live_print', label:'Physischer QR-Pilot getestet', ok: flag('MMOS_QR_PRINT_PILOT_GREEN'), external:true }
    ]
  },
  {
    key: 'booking_utilization',
    name: 'Termine & Auslastung',
    score: 62,
    category: 'Betrieb',
    status: 'partial',
    missing: [
      'Echte Kalenderintegration.',
      'Verfügbarkeitslogik finalisieren.',
      'Buchungsbestätigung per Mail/SMS.',
      'Terminerinnerungen live testen.',
      'No-Show-Logik mit echten Daten validieren.',
      'Warteliste/Last-Minute-Slots produktiv fertigstellen.',
      'Kunden-Self-Service für Terminänderung/Storno.'
    ],
    checks: [
      { key:'booking_registry', label:'Booking in Registry vorhanden', ok: read('frontend/src/lib/toolRegistry.ts').includes('online_booking') || read('frontend/src/lib/toolRegistry.ts').includes('booking_utilization') },
      { key:'route', label:'Admin Booking Route vorbereitet', ok: exists('frontend/src/app/admin/booking/page.tsx') || exists('frontend/src/app/admin/appointments/page.tsx') },
      { key:'calendar_env', label:'Kalenderprovider live gesetzt', ok: env('GOOGLE_CALENDAR_CLIENT_ID') || env('CALENDAR_PROVIDER'), external:true },
      { key:'live_booking', label:'Buchungsflow live getestet', ok: flag('MMOS_BOOKING_FLOW_GREEN'), external:true }
    ]
  },
  {
    key: 'inbox_chat_communication',
    name: 'Inbox & Chat',
    score: 55,
    category: 'Kommunikation',
    status: 'partial',
    missing: [
      'Echte Eingangskanäle anbinden.',
      'E-Mail-Postfach integrieren.',
      'Kontaktformular-Anfragen live einlesen.',
      'Google-/Social-/Website-Anfragen anbinden.',
      'Benachrichtigungen einbauen.',
      'Status-Workflow finalisieren.',
      'Kundenzuordnung automatisch verbessern.'
    ],
    checks: [
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('inbox_chat_communication') },
      { key:'route', label:'Inbox Route/UI vorhanden', ok: exists('frontend/src/app/inbox/page.tsx') || read('frontend/src/lib/toolRegistry.ts').includes("route: '/inbox'") },
      { key:'mailbox_env', label:'Mailbox/Webhook live gesetzt', ok: env('INBOUND_MAIL_WEBHOOK_SECRET') || env('MAILBOX_PROVIDER'), external:true },
      { key:'channel_live', label:'Mindestens ein echter Eingangskanal live', ok: flag('MMOS_INBOX_CHANNEL_GREEN'), external:true }
    ]
  },
  {
    key: 'payments_vouchers',
    name: 'Payments & Gutscheine',
    score: 50,
    category: 'Zahlungen',
    status: 'partial',
    missing: [
      'Payment Provider live anbinden.',
      'Stripe/PayPal/SumUp Zahlungslinks testen.',
      'Gutscheinverkauf rechtlich und steuerlich prüfen.',
      'Gutschein-Einlösung sauber dokumentieren.',
      'Storno-/Refund-Prozesse definieren.',
      'Rechnungs-/Umsatzverknüpfung finalisieren.',
      'Kassen-/Steuerlogik sauber abgrenzen.'
    ],
    checks: [
      { key:'ui', label:'Payments/Voucher UI vorhanden', ok: exists('frontend/src/app/payments-vouchers/page.tsx') },
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('payments_vouchers') },
      { key:'stripe', label:'Stripe Webhook gesetzt oder bewusst aus', ok: env('STRIPE_WEBHOOK_SECRET') || flag('MMOS_NO_WEBHOOKS_USED'), external:true },
      { key:'legal_voucher', label:'Gutschein-/Zahlungslogik rechtlich geprüft', ok: flag('MMOS_VOUCHER_LEGAL_GREEN'), external:true }
    ]
  },
  {
    key: 'referral_program',
    name: 'Empfehlungsprogramm',
    score: 58,
    category: 'Loyalty',
    status: 'partial',
    missing: [
      'Referral-Links live generieren und tracken.',
      'Missbrauchsschutz einbauen.',
      'Prämienlogik sauber mit Loyalty verbinden.',
      'Empfehlungsstatus sichtbar machen.',
      'Endkunde-zu-Endkunde-Fluss testen.',
      'Auswertung pro Kampagne ergänzen.'
    ],
    checks: [
      { key:'route', label:'Referral Backend/Route vorhanden', ok: exists('backend/src/routes/referralRoutes.js') },
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('referral_program') },
      { key:'live_flow', label:'Referral End-to-End live getestet', ok: flag('MMOS_REFERRAL_FLOW_GREEN'), external:true },
      { key:'abuse_guard', label:'Missbrauchsschutz bestätigt', ok: flag('MMOS_REFERRAL_ABUSE_GUARD_GREEN'), external:true }
    ]
  },
  {
    key: 'dashboard_reporting',
    name: 'Dashboard & Reporting',
    score: 82,
    category: 'Reporting',
    status: 'pilot_ready',
    missing: [
      'Alle Kennzahlen mit echten Datenquellen verbinden.',
      'Report-Kennzahlen final definieren.',
      'Kundenportal-Freigabeprozess testen.',
      'Monatsvergleich stabilisieren.',
      'Fehler bei fehlenden Daten sauber anzeigen.',
      'Export/Download live testen.'
    ],
    checks: [
      { key:'portal', label:'Portal/Reports vorhanden', ok: exists('frontend/src/app/portal/reports/page.tsx') && exists('frontend/src/app/portal/page.tsx') },
      { key:'monthly', label:'Monatsreport UI vorhanden', ok: exists('frontend/src/app/admin/reports/monthly/page.tsx') },
      { key:'pdf', label:'PDF-Versand Service vorhanden', ok: exists('backend/src/services/monthlyReportDeliveryService.js') },
      { key:'live_report', label:'Echter Monatsreport live getestet', ok: flag('MMOS_REPORT_LIVE_GREEN'), external:true }
    ]
  },
  {
    key: 'sumup_revenue_connection',
    name: 'SumUp Umsatzdaten',
    score: 78,
    category: 'Zahlungen',
    status: 'prepared',
    missing: [
      'Echten SumUp Access Token live testen.',
      'Echten Merchant Code testen.',
      'Echte Transaktionen abrufen.',
      'OAuth statt manueller Token-Eingabe ergänzen.',
      'Token Refresh einbauen.',
      'Automatische Zuordnung zu QR/Termin/Loyalty verbessern.',
      'Webhook-Verifizierung nach Live-Vorgabe testen.'
    ],
    checks: [
      { key:'service', label:'SumUp Sync Service vorhanden', ok: read('backend/src/services/posService.js').includes('syncSumUpTransactions') },
      { key:'ui', label:'Umsatz & Zahlungen UI vorhanden', ok: read('frontend/src/app/admin/pos/page.tsx').includes('Umsatz & Zahlungen') },
      { key:'migration', label:'Migration 0100 vorhanden', ok: exists('supabase/migrations/0100_sumup_revenue_connection_v1.sql') },
      { key:'live_sumup', label:'SumUp live getestet', ok: flag('MMOS_SUMUP_LIVE_GREEN'), external:true }
    ]
  },
  {
    key: 'monthly_report_pdf_delivery',
    name: 'Monatsreport PDF & Versand',
    score: 76,
    category: 'Reporting',
    status: 'prepared',
    missing: [
      'GOTENBERG_URL live setzen.',
      'Echte PDF-Erzeugung testen.',
      'RESEND_API_KEY live setzen.',
      'MAIL_FROM mit verifizierter Domain setzen.',
      'Report-Mail mit Anhang an echte Adresse testen.',
      'Fehlerfälle bei PDF-/Mailfehlern schöner anzeigen.',
      'Report-Design finalisieren.'
    ],
    checks: [
      { key:'service', label:'PDF Delivery Service vorhanden', ok: exists('backend/src/services/monthlyReportDeliveryService.js') },
      { key:'gotenberg', label:'GOTENBERG_URL gesetzt', ok: env('GOTENBERG_URL'), external:true },
      { key:'resend', label:'RESEND_API_KEY gesetzt', ok: env('RESEND_API_KEY'), external:true },
      { key:'live_pdf_mail', label:'PDF-Mail live getestet', ok: flag('MMOS_PDF_MAIL_LIVE_GREEN'), external:true }
    ]
  },
  {
    key: 'customer_portal_pro',
    name: 'Kundenportal Pro',
    score: 73,
    category: 'Portal',
    status: 'prepared',
    missing: [
      'Echtes Kunden-Dashboard ausbauen.',
      'QR-Kampagnen im Kundenportal anzeigen.',
      'Loyalty-Daten im Kundenportal anzeigen.',
      'Kampagnenfreigaben durch Kunden ermöglichen.',
      'Team-/Benutzerverwaltung ergänzen.',
      'Einstellungen/Stammdaten für Kunden ergänzen.',
      'Billing-/Paketübersicht ergänzen.'
    ],
    checks: [
      { key:'portal_home', label:'/portal vorhanden', ok: exists('frontend/src/app/portal/page.tsx') },
      { key:'backoffice', label:'/portal/backoffice vorhanden', ok: exists('frontend/src/app/portal/backoffice/page.tsx') },
      { key:'reports', label:'/portal/reports vorhanden', ok: exists('frontend/src/app/portal/reports/page.tsx') },
      { key:'self_service', label:'Self-Service V2 live', ok: flag('MMOS_PORTAL_SELF_SERVICE_GREEN'), external:true }
    ]
  },
  {
    key: 'retention_intelligence_suite',
    name: 'Retention Intelligence',
    score: 84,
    category: 'Retention',
    status: 'pilot_ready',
    missing: [
      'Mit echten Kundendaten validieren.',
      'Segmentqualität prüfen.',
      'Branchenlogik anpassbar machen.',
      'Erfolg von Reaktivierungsaktionen messen.',
      'Automatische Empfehlungen weiter verfeinern.',
      'Kundenseitige Freigabe/Ansicht verbessern.'
    ],
    checks: [
      { key:'service', label:'Retention Service vorhanden', ok: exists('backend/src/services/retentionIntelligenceSuiteService.js') },
      { key:'ui', label:'Retention UI vorhanden', ok: exists('frontend/src/app/admin/retention/intelligence/page.tsx') },
      { key:'segment', label:'Segment-Kampagnen vorhanden', ok: exists('backend/src/services/retentionSegmentCampaignService.js') },
      { key:'real_data', label:'Mit echten Daten validiert', ok: flag('MMOS_RETENTION_REAL_DATA_GREEN'), external:true }
    ]
  },
  {
    key: 'customer_value_score',
    name: 'Customer Value Score',
    score: 82,
    category: 'Retention',
    status: 'pilot_ready',
    missing: [
      'Score-Gewichtung mit echten Daten kalibrieren.',
      'Branchenspezifische Gewichtung ermöglichen.',
      'Score-Historie speichern.',
      'Score-Erklärungen kundenseitig schöner machen.',
      'Aktionen aus Score automatisch ableiten.'
    ],
    checks: [
      { key:'score', label:'Value Score Logik vorhanden', ok: read('backend/src/services/retentionIntelligenceSuiteService.js').includes('value') || read('frontend/src/lib/customerToolModules.ts').includes('customer_value_score') },
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('customer_value_score') },
      { key:'history', label:'Score-Historie live bestätigt', ok: flag('MMOS_VALUE_SCORE_HISTORY_GREEN'), external:true },
      { key:'calibration', label:'Score kalibriert', ok: flag('MMOS_VALUE_SCORE_CALIBRATED'), external:true }
    ]
  },
  {
    key: 'segment_campaigns',
    name: 'Segment-Kampagnen',
    score: 76,
    category: 'Kampagnen',
    status: 'prepared',
    missing: [
      'Kundenfreigabeprozess ergänzen.',
      'Zeitplanung/Scheduling einbauen.',
      'Echten Versand anbinden.',
      'A/B-Varianten ermöglichen.',
      'Kampagnenerfolg messen.',
      'Umsatzzuordnung über SumUp/QR/Loyalty ausbauen.'
    ],
    checks: [
      { key:'service', label:'Segment Campaign Service vorhanden', ok: exists('backend/src/services/retentionSegmentCampaignService.js') },
      { key:'ui', label:'Start aus Retention UI vorhanden', ok: read('frontend/src/app/admin/retention/intelligence/page.tsx').includes('Segment-Kampagne') },
      { key:'approval', label:'Kundenfreigabe live', ok: flag('MMOS_CAMPAIGN_APPROVAL_FLOW_GREEN'), external:true },
      { key:'automation', label:'Kampagnenautomatisierung live', ok: flag('MMOS_CAMPAIGN_AUTOMATION_GREEN'), external:true }
    ]
  },
  {
    key: 'consent_center_double_optin',
    name: 'Consent Center / Double-Opt-in',
    score: 82,
    category: 'Consent',
    status: 'pilot_ready',
    missing: [
      'Resend-Domain live verifizieren.',
      'SPF/DKIM/DMARC setzen.',
      'Echte Double-Opt-in-Mail testen.',
      'Abmeldelink live testen.',
      'Consent-Texte anwaltlich prüfen.',
      'Datenschutzerklärung final abstimmen.',
      'Einwilligungsnachweise mit echten Endkunden testen.'
    ],
    checks: [
      { key:'service', label:'DOI Service vorhanden', ok: exists('backend/src/services/marketingConsentMailService.js') },
      { key:'center', label:'Consent Center vorhanden', ok: exists('frontend/src/app/marketing/consent-center/page.tsx') },
      { key:'unsubscribe', label:'Unsubscribe Seite vorhanden', ok: exists('frontend/src/app/marketing/unsubscribe/page.tsx') },
      { key:'legal', label:'Rechtliche Freigabe bestätigt', ok: flag('MMOS_LEGAL_REVIEW_DONE'), external:true }
    ]
  },
  {
    key: 'churn_prevention_center',
    name: 'Churn Prevention',
    score: 75,
    category: 'Retention',
    status: 'prepared',
    missing: [
      'Echte Churn-Daten sammeln.',
      'Risiko-Score validieren.',
      'Branchenspezifische Schwellenwerte festlegen.',
      'Winback-Erfolge messen.',
      'Automatische Folgeaktionen ergänzen.',
      'Verknüpfung mit Reminder/Kampagnen ausbauen.'
    ],
    checks: [
      { key:'retention', label:'Retention Basis vorhanden', ok: exists('backend/src/services/retentionIntelligenceSuiteService.js') },
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('churn_prevention_center') },
      { key:'thresholds', label:'Schwellenwerte validiert', ok: flag('MMOS_CHURN_THRESHOLDS_GREEN'), external:true },
      { key:'winback', label:'Winback Erfolg gemessen', ok: flag('MMOS_WINBACK_RESULTS_GREEN'), external:true }
    ]
  },
  {
    key: 'feedback_action_board',
    name: 'Feedback-to-Action Board',
    score: 70,
    category: 'Reputation',
    status: 'prepared',
    missing: [
      'Echtes Aufgabenboard ausbauen.',
      'Verantwortliche zuweisen.',
      'Fristen setzen.',
      'Statusverlauf einbauen.',
      'Benachrichtigungen ergänzen.',
      'Kundenfreigabe/interne Bearbeitung trennen.'
    ],
    checks: [
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('feedback_action_board') },
      { key:'feedback', label:'Review/Feedback Basis vorhanden', ok: exists('frontend/src/app/admin/review-intelligence/page.tsx') || read('frontend/src/lib/toolRegistry.ts').includes('review_intelligence') },
      { key:'tasks', label:'Aufgabenstatus live', ok: flag('MMOS_FEEDBACK_TASKS_GREEN'), external:true },
      { key:'notifications', label:'Benachrichtigungen live', ok: flag('MMOS_FEEDBACK_NOTIFICATIONS_GREEN'), external:true }
    ]
  },
  {
    key: 'service_recovery_tool',
    name: 'Service Recovery',
    score: 68,
    category: 'Reputation',
    status: 'prepared',
    missing: [
      'Recovery-Vorlagen ergänzen.',
      'Eskalationsstufen definieren.',
      'Kulanz-/Gutscheinlogik verbinden.',
      'Follow-up nach Servicefall automatisieren.',
      'Erfolgsmessung nach Recovery ergänzen.',
      'Verknüpfung mit Reviews/Tickets verbessern.'
    ],
    checks: [
      { key:'package', label:'Paketmodul vorhanden', ok: read('frontend/src/lib/customerToolModules.ts').includes('service_recovery_tool') },
      { key:'retention_ui', label:'In Retention/Feedback Kontext sichtbar', ok: exists('frontend/src/app/admin/retention/intelligence/page.tsx') },
      { key:'templates', label:'Recovery-Vorlagen final', ok: flag('MMOS_RECOVERY_TEMPLATES_GREEN'), external:true },
      { key:'tracking', label:'Recovery-Erfolg messbar', ok: flag('MMOS_RECOVERY_TRACKING_GREEN'), external:true }
    ]
  },
  {
    key: 'mail_domain_consent_guard',
    name: 'Mail-Domain & Consent Guard',
    score: 80,
    category: 'Mail/Compliance',
    status: 'pilot_ready',
    missing: [
      'Echte Resend-Domain verifizieren.',
      'SPF/DKIM/DMARC live prüfen.',
      'Echte Testmail senden.',
      'Echten Abmeldelink testen.',
      'Proof-Screenshots/Nachweise speichern.',
      'Anwaltliche Freigabe als Proof hinterlegen.'
    ],
    checks: [
      { key:'page', label:'Mail-Domain Seite vorhanden', ok: exists('frontend/src/app/admin/production/mail-domain/page.tsx') },
      { key:'service', label:'Readiness Service vorhanden', ok: exists('backend/src/services/mailDomainLiveReadinessService.js') },
      { key:'domain_flag', label:'Mail-Domain live verifiziert', ok: flag('MMOS_MAIL_DOMAIN_VERIFIED'), external:true },
      { key:'legal', label:'Rechtsfreigabe vorhanden', ok: flag('MMOS_LEGAL_REVIEW_DONE'), external:true }
    ]
  },
  {
    key: 'system_completeness_audit',
    name: 'Completeness Audit',
    score: 89,
    category: 'Production',
    status: 'pilot_ready',
    missing: [
      'Live-Proof-Flags mit echten Tests füllen.',
      'Deployment-Status automatisch einbeziehen.',
      'Monitoring-Ergebnisse anbinden.',
      'Supabase-Migrationsergebnisse live prüfen.',
      'E2E-Teststatus automatisch auslesen.',
      'PDF-/Exportfunktion für Audit ergänzen.'
    ],
    checks: [
      { key:'page', label:'Completeness Audit Seite vorhanden', ok: exists('frontend/src/app/admin/production/completeness-audit/page.tsx') },
      { key:'api', label:'Completeness API vorhanden', ok: exists('backend/src/routes/completenessAuditRoutes.js') },
      { key:'tool_readiness', label:'Tool Readiness Center vorhanden', ok: exists('frontend/src/app/admin/production/tool-readiness/page.tsx') },
      { key:'e2e', label:'E2E Live Status gesetzt', ok: flag('MMOS_PLAYWRIGHT_E2E_GREEN'), external:true }
    ]
  },
  {
    key: 'go_live_cockpit',
    name: 'Go-Live Cockpit',
    score: 87,
    category: 'Production',
    status: 'pilot_ready',
    missing: [
      'Echte Kundendaten einbeziehen.',
      'Live-ENV automatisch prüfen.',
      'Proof-Flags aus Completeness Audit übernehmen.',
      'Deployment-/Monitoringstatus integrieren.',
      'Pilotkunden-Checkliste als PDF exportieren.',
      'Regelmäßige Go-Live-Prüfung automatisieren.'
    ],
    checks: [
      { key:'page', label:'Go-Live Seite vorhanden', ok: exists('frontend/src/app/admin/go-live/page.tsx') },
      { key:'service', label:'Go-Live Service vorhanden', ok: exists('backend/src/services/goLiveCockpitService.js') },
      { key:'completeness', label:'Completeness verknüpft', ok: exists('frontend/src/app/admin/production/completeness-audit/page.tsx') },
      { key:'live_customer', label:'Pilotkunde live durchgetestet', ok: flag('MMOS_PILOT_CUSTOMER_E2E_GREEN'), external:true }
    ]
  }
]

function level(score) {
  if (score >= 90) return 'ready_candidate'
  if (score >= 80) return 'pilot_ready'
  if (score >= 70) return 'prepared'
  if (score >= 60) return 'partial'
  return 'immature'
}

function adjustedScore(tool) {
  const checks = tool.checks || []
  const external = checks.filter((c) => c.external)
  const hardMissing = external.filter((c) => !c.ok).length
  return Math.max(35, Math.min(100, tool.score - hardMissing * 2))
}

function toolReadinessOverview() {
  const tools = TOOL_READINESS.map((tool) => {
    const liveScore = adjustedScore(tool)
    const checkScore = Math.round(((tool.checks || []).filter((c) => c.ok).length / Math.max((tool.checks || []).length, 1)) * 100)
    const fullMissing = [
      ...tool.missing,
      ...(tool.checks || []).filter((c) => !c.ok).map((c) => c.external ? `Live-Nachweis offen: ${c.label}` : `Systemcheck offen: ${c.label}`)
    ]
    return {
      ...tool,
      live_score: liveScore,
      check_score: checkScore,
      status: level(liveScore),
      missing: [...new Set(fullMissing)]
    }
  })
  const avg = Math.round((tools.reduce((sum, t) => sum + t.live_score, 0) / tools.length) * 10) / 10
  const blockers = tools.flatMap((t) => (t.checks || []).filter((c) => !c.ok && c.external).map((c) => ({ tool: t.key, name: t.name, check: c.key, label: c.label })))
  const weakest = [...tools].sort((a, b) => a.live_score - b.live_score).slice(0, 6)
  const strongest = [...tools].sort((a, b) => b.live_score - a.live_score).slice(0, 6)
  return {
    ok: avg >= 90 && blockers.length === 0,
    average_score: avg,
    generated_at: new Date().toISOString(),
    total_tools: tools.length,
    tools,
    blockers,
    weakest,
    strongest,
    summary: {
      ready_candidate: tools.filter((t) => t.status === 'ready_candidate').length,
      pilot_ready: tools.filter((t) => t.status === 'pilot_ready').length,
      prepared: tools.filter((t) => t.status === 'prepared').length,
      partial: tools.filter((t) => t.status === 'partial').length,
      immature: tools.filter((t) => t.status === 'immature').length
    }
  }
}

function toolReadinessMarkdown() {
  const overview = toolReadinessOverview()
  const lines = []
  lines.push('# MMOS Tool-Produktionsreife 1-100\\n')
  lines.push(`Stand: ${overview.generated_at}\\n\\n`)
  lines.push(`Durchschnitt: **${overview.average_score}/100**\\n\\n`)
  lines.push('| Tool | Score | Status | Was fehlt |\\n|---|---:|---|---|\\n')
  for (const tool of overview.tools) {
    lines.push(`| ${tool.name} | ${tool.live_score} | ${tool.status} | ${tool.missing.slice(0, 5).join('<br/>')} |\\n`)
  }
  return lines.join('')
}

module.exports = { TOOL_READINESS, toolReadinessOverview, toolReadinessMarkdown }
