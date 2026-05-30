import { mmosToolRegistry, type PackageTier } from './toolRegistry'

export const INTERNAL_ONLY_TOOL_KEYS = new Set([
  'lead_audit_engine','google_business_audit','mini_audit_generator','lead_scraper','offer_generator','contract_generator','value_offer_generator','tool_access','tool_access_v2','package_matrix','tool_module_catalog','subscriptions','users','api_keys','demo_data_center'
])

const PACKAGE_LEVEL: Record<PackageTier, number> = { starter: 1, growth: 2, premium: 3 }

export function normalizeRole(profile: any): string {
  return String(profile?.role || '').toLowerCase().trim()
}
export function isActiveProfile(profile: any) {
  const status = String(profile?.status || 'active').toLowerCase()
  return Boolean(profile) && status === 'active'
}
export function isActiveAdmin(profile: any) {
  const role = normalizeRole(profile)
  return isActiveProfile(profile) && (role === 'admin' || role === 'super_admin')
}
export function isActiveCustomer(profile: any) {
  const role = normalizeRole(profile)
  return isActiveProfile(profile) && role !== 'admin' && role !== 'super_admin'
}
export function normalizeTier(value: any): PackageTier {
  const v = String(value || '').toLowerCase()
  if (v.includes('premium')) return 'premium'
  if (v.includes('growth')) return 'growth'
  return 'starter'
}
export function toolIsInternalOnly(toolKey: string) {
  const tool = mmosToolRegistry.find((item) => item.key === toolKey)
  return INTERNAL_ONLY_TOOL_KEYS.has(toolKey) || Boolean(tool && !tool.visibleToCustomer)
}
export function customerPackageAllowsTool(profile: any, toolKey: string) {
  if (toolIsInternalOnly(toolKey)) return false
  const tool = mmosToolRegistry.find((item) => item.key === toolKey)
  if (!tool) return true
  const tier = normalizeTier(profile?.package_name || profile?.package || profile?.tier)
  return PACKAGE_LEVEL[tier] >= PACKAGE_LEVEL[tool.packageMin]
}
