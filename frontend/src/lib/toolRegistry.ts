export type MmosTool = {
  key: string
  label: string
  area: 'admin' | 'customer' | 'shared'
  category: string
  packageMin: 'starter' | 'growth' | 'premium'
  route?: string
  description: string
  visibleToCustomer: boolean
}

export const mmosToolRegistry: MmosTool[] = [
  { key:'dashboard', label:'Dashboard', area:'shared', category:'Core', packageMin:'starter', route:'/dashboard', description:'Zentrale Übersicht mit KPIs, Aufgaben und Schnellzugriffen.', visibleToCustomer:true },
  { key:'crm', label:'CRM / Kundenakte', area:'admin', category:'CRM', packageMin:'starter', route:'/admin/customers', description:'Kundenverwaltung, Kundendaten, Timeline und Status.', visibleToCustomer:false },
  { key:'customer_health', label:'Customer Health', area:'admin', category:'CRM', packageMin:'premium', route:'/admin/customer-health', description:'Health Score, Risiken, Chancen und Warnungen.', visibleToCustomer:false },
  { key:'customer_intelligence', label:'Customer Intelligence', area:'admin', category:'CRM', packageMin:'premium', route:'/admin/customer-intelligence', description:'Risk Score, Upsell Score, Paketnutzung und Empfehlungen.', visibleToCustomer:false },
  { key:'timeline', label:'Timeline Events', area:'admin', category:'CRM', packageMin:'growth', route:'/admin/timeline', description:'Chronologische Verknüpfung aus QR, Loyalty, Reviews, Billing und Tickets.', visibleToCustomer:false },

  { key:'qr_campaigns', label:'QR Kampagnen', area:'shared', category:'QR & Loyalty', packageMin:'growth', route:'/qr-campaigns', description:'QR-Kampagnen mit Slug, Zielseite, Scans, Conversions und Tool-Verknüpfung.', visibleToCustomer:true },
  { key:'public_landing_page', label:'Öffentliche /l/[slug] Seite', area:'shared', category:'QR & Loyalty', packageMin:'growth', route:'/l/[slug]', description:'Öffentliche Endkundenseite für QR, Review und Loyalty.', visibleToCustomer:true },
  { key:'loyalty', label:'Loyalty Programm', area:'shared', category:'QR & Loyalty', packageMin:'growth', route:'/loyalty', description:'Punkteprogramm über QR-Code mit nachträglicher Kampagnenverknüpfung.', visibleToCustomer:true },
  { key:'loyalty_rewards', label:'Rewards', area:'shared', category:'QR & Loyalty', packageMin:'growth', route:'/loyalty/rewards', description:'Einlösbare Prämien, Rabatte, Produkte und VIP-Rewards.', visibleToCustomer:true },
  { key:'loyalty_reward_rules', label:'Reward Regeln', area:'shared', category:'QR & Loyalty', packageMin:'premium', route:'/loyalty/rules', description:'Konfiguration von Reward-Typen, Punktebedarf und Bedingungen.', visibleToCustomer:true },
  { key:'staff_confirmation_codes', label:'Mitarbeiter-Bestätigungscode', area:'shared', category:'QR & Loyalty', packageMin:'premium', route:'/loyalty/staff-codes', description:'Mitarbeiter bestätigen Reward-Einlösungen per Code.', visibleToCustomer:true },
  { key:'loyalty_segments', label:'Loyalty Segmente', area:'shared', category:'QR & Loyalty', packageMin:'premium', route:'/loyalty/segments', description:'VIP, inaktiv, reward-ready und review-aktive Endkunden.', visibleToCustomer:true },
  { key:'smart_loyalty_v2', label:'Smart Loyalty V2', area:'shared', category:'QR & Loyalty', packageMin:'premium', route:'/loyalty/smart', description:'VIP-Level, Multiplikatoren, Punkte-Regeln und Smart Actions.', visibleToCustomer:true },

  { key:'reviews', label:'Reviews', area:'shared', category:'Reviews', packageMin:'growth', route:'/reviews', description:'Feedback, Bewertungsliste und Review-Funnel.', visibleToCustomer:true },
  { key:'review_intelligence', label:'Review Intelligence', area:'shared', category:'Reviews', packageMin:'premium', route:'/reviews/intelligence', description:'Sentiment, Themen, Antwortvorschläge und Eskalation.', visibleToCustomer:true },
  { key:'review_response_templates', label:'Antwortvorlagen', area:'shared', category:'Reviews', packageMin:'premium', route:'/reviews/templates', description:'Vorlagen für positive, neutrale und negative Bewertungen.', visibleToCustomer:true },

  { key:'smart_automation', label:'Smart Automation', area:'shared', category:'Automation', packageMin:'premium', route:'/automation/smart', description:'Regelbasierte Automationen aus QR, Loyalty, Reviews und Health.', visibleToCustomer:true },
  { key:'marketing_automation', label:'Marketing Automation', area:'shared', category:'Marketing', packageMin:'premium', route:'/marketing/automation', description:'Reaktivierung, Review Booster, Loyalty-Boost und Kampagnen.', visibleToCustomer:true },
  { key:'ai_business_assistant', label:'AI Business Assistant', area:'shared', category:'AI', packageMin:'premium', route:'/ai-assistant', description:'Hinweise, Chancen, Risiken und Handlungsempfehlungen.', visibleToCustomer:true },

  { key:'booking', label:'Booking / Termine', area:'shared', category:'Operations', packageMin:'starter', route:'/booking', description:'Termine, Services, Kategorien und Umsätze.', visibleToCustomer:true },
  { key:'invoices', label:'Rechnungen', area:'shared', category:'Billing', packageMin:'starter', route:'/invoices', description:'Rechnungen, Status, PDF und Umsatzbezug.', visibleToCustomer:true },
  { key:'tickets', label:'Tickets', area:'shared', category:'Support', packageMin:'starter', route:'/tickets', description:'Support, Review-Eskalation und Kundenanfragen.', visibleToCustomer:true },
  { key:'pipeline', label:'Pipeline', area:'admin', category:'Sales', packageMin:'growth', route:'/admin/pipeline', description:'Leads, Chancen, Forecast und Upsell-Potenzial.', visibleToCustomer:false },

  { key:'package_matrix', label:'Paket-Matrix', area:'admin', category:'Billing', packageMin:'starter', route:'/admin/packages', description:'Paketlogik, Tool-Zugriffe und Feature-Matrix.', visibleToCustomer:false },
  { key:'dynamic_billing', label:'Dynamic Billing', area:'admin', category:'Billing', packageMin:'premium', route:'/admin/dynamic-billing', description:'Usage-basierte Zusatzabrechnung aus QR, AI, Reviews und Automationen.', visibleToCustomer:false },
  { key:'revenue_forecasting', label:'Revenue Forecasting', area:'admin', category:'Analytics', packageMin:'premium', route:'/admin/revenue-forecasting', description:'MRR, Pipeline, Forecast, Churn Risk und Umsatztreiber.', visibleToCustomer:false },
  { key:'revenue_share', label:'Revenue Share', area:'admin', category:'Billing', packageMin:'premium', route:'/admin/revenue-share', description:'Prozentuale Weitergabe, Stripe-Connect-Vorbereitung und Abrechnungslogik.', visibleToCustomer:false },
  { key:'package_recommendations', label:'Package Recommendations', area:'admin', category:'Billing', packageMin:'premium', route:'/admin/package-recommendations', description:'Upgrade-, Add-on- und Risikoempfehlungen aus Nutzungsdaten.', visibleToCustomer:false }
]

export const adminToolSections = [
  { key:'dashboard', label:'Dashboard', icon:'📊', tools:['dashboard','customer_health','customer_intelligence','ai_business_assistant'] },
  { key:'crm', label:'CRM', icon:'👥', tools:['crm','timeline','tickets','pipeline'] },
  { key:'qr-loyalty', label:'QR & Loyalty', icon:'🎯', tools:['qr_campaigns','public_landing_page','loyalty','loyalty_rewards','loyalty_reward_rules','staff_confirmation_codes','loyalty_segments','smart_loyalty_v2'] },
  { key:'reviews', label:'Reviews', icon:'⭐', tools:['reviews','review_intelligence','review_response_templates'] },
  { key:'automation', label:'Automation & Marketing', icon:'🤖', tools:['smart_automation','marketing_automation','ai_business_assistant'] },
  { key:'operations', label:'Operations', icon:'📅', tools:['booking','invoices','tickets'] },
  { key:'billing', label:'Billing & Revenue', icon:'💳', tools:['package_matrix','dynamic_billing','revenue_forecasting','revenue_share','package_recommendations'] }
]

export const customerToolSections = [
  { key:'dashboard', label:'Dashboard', icon:'📊', tools:['dashboard'] },
  { key:'qr-loyalty', label:'QR & Loyalty', icon:'🎯', tools:['qr_campaigns','public_landing_page','loyalty','loyalty_rewards','loyalty_reward_rules','staff_confirmation_codes','loyalty_segments','smart_loyalty_v2'] },
  { key:'reviews', label:'Reviews', icon:'⭐', tools:['reviews','review_intelligence','review_response_templates'] },
  { key:'automation', label:'Marketing & Automation', icon:'📣', tools:['marketing_automation','smart_automation','ai_business_assistant'] },
  { key:'operations', label:'Betrieb', icon:'📅', tools:['booking','invoices','tickets'] },
  { key:'analytics', label:'Analytics', icon:'📈', tools:['customer_health','customer_intelligence'] }
]

export function toolsForPackage(packageKey: string) {
  const order = { starter: 1, growth: 2, premium: 3 } as const
  const level = order[(packageKey || 'starter').toLowerCase() as keyof typeof order] || 1
  return mmosToolRegistry.filter(tool => level >= (order[tool.packageMin] || 1))
}

export function customerVisibleToolsForPackage(packageKey: string) {
  return toolsForPackage(packageKey).filter(tool => tool.visibleToCustomer)
}
