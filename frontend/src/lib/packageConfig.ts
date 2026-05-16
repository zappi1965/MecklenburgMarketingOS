
import { toolsForPackage } from './toolRegistry'

const labels: Record<string, string> = {
  dashboard:'Dashboard',
  invoices:'Rechnungen',
  tickets:'Tickets',
  booking:'Booking',
  qr_campaigns:'QR Kampagnen',
  loyalty:'Loyalty Programm',
  loyalty_rewards:'Rewards',
  loyalty_reward_rules:'Reward Regeln',
  staff_confirmation_codes:'Mitarbeitercode',
  loyalty_segments:'Loyalty Segmente',
  smart_loyalty_v2:'Smart Loyalty V2',
  reviews:'Reviews',
  review_intelligence:'Review Intelligence',
  review_response_templates:'Antwortvorlagen',
  marketing_automation:'Marketing Automation',
  smart_automation:'Smart Automation',
  ai_business_assistant:'AI Business Assistant',
  customer_health:'Customer Health',
  customer_intelligence:'Customer Intelligence',
  dynamic_billing:'Dynamic Billing',
  revenue_forecasting:'Revenue Forecasting',
  revenue_share:'Revenue Share',
  package_matrix:'Paket-Matrix',
  package_recommendations:'Package Recommendations',
  public_landing_page:'Öffentliche QR Landingpage',
  pipeline:'Pipeline',
  crm:'CRM',
  timeline:'Timeline'
}

function toolKeys(packageKey: string) {
  return toolsForPackage(packageKey).map(tool => tool.key)
}

function featureLabels(packageKey: string) {
  return toolKeys(packageKey).map(key => labels[key] || key.replaceAll('_', ' '))
}

export const packageMatrix = [
  {
    key:'starter',
    name:'Starter',
    subtitle:'Basis für kleine Betriebe',
    price:149,
    cta:'Starter anfragen',
    tools:toolKeys('starter'),
    features:featureLabels('starter')
  },
  {
    key:'growth',
    name:'Growth',
    subtitle:'QR, Reviews und Kundenbindung',
    price:299,
    cta:'Growth anfragen',
    tools:toolKeys('growth'),
    features:featureLabels('growth')
  },
  {
    key:'premium',
    name:'Premium',
    subtitle:'Vollständiges Marketing OS mit AI, Automation, Billing und Forecasting',
    price:499,
    cta:'Premium anfragen',
    tools:toolKeys('premium'),
    features:featureLabels('premium')
  }
]
