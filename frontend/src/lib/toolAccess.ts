
'use client'

import { mmosToolRegistry, type PackageTier } from './toolRegistry'

export type ToolAccessStatus = 'Aktiv' | 'Gesperrt' | 'Add-on' | 'Upgrade'

const tierRank: Record<PackageTier, number> = {
  starter: 1,
  growth: 2,
  premium: 3
}

function normalizeTier(value: any): PackageTier {
  const v = String(value || '').toLowerCase()
  if (v.includes('premium')) return 'premium'
  if (v.includes('growth')) return 'growth'
  return 'starter'
}

export function packageAllowsTool(customer: any, toolKey: string) {
  const tool = mmosToolRegistry.find((item) => item.key === toolKey)
  if (!tool) return true
  const customerTier = normalizeTier(customer?.package_name || customer?.package || customer?.tier)
  return tierRank[customerTier] >= tierRank[tool.packageMin]
}

export function explicitToolRule(accessRules: any[] = [], toolKey: string) {
  return accessRules.find((rule) => String(rule.tool_key) === String(toolKey))
}

export function canAccessTool(customer: any, toolKey: string, accessRules: any[] = []) {
  const explicit = explicitToolRule(accessRules, toolKey)
  const explicitStatus = String(explicit?.status || '').toLowerCase()

  if (explicitStatus === 'gesperrt') return false
  if (explicitStatus === 'aktiv' || explicitStatus === 'add-on' || explicitStatus === 'addon') return true

  return packageAllowsTool(customer, toolKey)
}

export function accessStatus(customer: any, toolKey: string, accessRules: any[] = []): ToolAccessStatus {
  const explicit = explicitToolRule(accessRules, toolKey)
  const explicitStatus = String(explicit?.status || '').toLowerCase()

  if (explicitStatus === 'gesperrt') return 'Gesperrt'
  if (explicitStatus === 'add-on' || explicitStatus === 'addon') return 'Add-on'
  if (explicitStatus === 'aktiv') return 'Aktiv'

  return packageAllowsTool(customer, toolKey) ? 'Aktiv' : 'Upgrade'
}
