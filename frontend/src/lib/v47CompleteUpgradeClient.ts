'use client'

import { hasSupabase, supabase } from './supabase'
import { isDemoMode, shouldIncludeDemoRecord } from './environmentMode'
import { reportClientError } from './errorReporter'
import {
  buildPublicUrl,
  customerName,
  insertRow,
  loadV44Context,
  matchesCustomer,
  selectTable,
  uid,
  type V44Context,
  type V44TableName
} from './v44FunctionalToolsClient'
import { calculateCustomerValue, loadValueContext } from './v46ValueClient'

export type V47TableName =
  | 'v47_heatmap_points'
  | 'v47_slug_hub_settings'
  | 'v47_review_goals'
  | 'v47_loyalty_goals'
  | 'v47_lead_audits'
  | 'v47_value_offers'
  | 'v47_tool_access_rules'
  | 'v47_customer_health_events'
  | 'v47_automation_playbooks'
  | 'v47_media_report_links'

export type V47Context = V44Context & Record<V47TableName, any[]> & {
  v46_value_reports?: any[]
}

export const v47Tables: V47TableName[] = [
  'v47_heatmap_points',
  'v47_slug_hub_settings',
  'v47_review_goals',
  'v47_loyalty_goals',
  'v47_lead_audits',
  'v47_value_offers',
  'v47_tool_access_rules',
  'v47_customer_health_events',
  'v47_automation_playbooks',
  'v47_media_report_links'
]

function storageKey(table: string) {
  return `mmos:v47:${table}`
}

function isDemoRecord(row: any) {
  return Boolean(row?.is_demo) || String(row?.name || row?.title || row?.customer_name || '').toUpperCase().startsWith('DEMO')
}

function filterMode(rows: any[]) {
  return rows.filter(shouldIncludeDemoRecord)
}

function readLocal(table: string) {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(table)) || '[]')
  } catch (error) {
    reportClientError('v47_read_local_failed', error, { table })
    return []
  }
}

function writeLocal(table: string, rows: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(table), JSON.stringify(rows))
}

function mergeById(...groups: any[][]) {
  const map = new Map<string, any>()
  for (const group of groups) {
    for (const row of group || []) {
      const id = String(row?.id || uid('row'))
      map.set(id, { ...(map.get(id) || {}), ...row })
    }
  }
  return Array.from(map.values())
}

async function selectV47Table(table: V47TableName): Promise<any[]> {
  let remote: any[] = []
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false })
      if (!error) remote = data || []
    } catch (error) {
      reportClientError('v47_select_table_failed', error, { table })
    }
  }
  return filterMode(mergeById(remote, readLocal(table)))
}

export async function insertV47Row(table: V47TableName, row: any) {
  const payload = {
    id: row.id || uid(table),
    ...row,
    is_demo: row.is_demo ?? isDemoMode(),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from(table).insert(payload).select('*').single()
      if (!error) return data || payload
    } catch (error) {
      reportClientError('v47_insert_row_failed', error, { table })
    }
  }

  const rows = readLocal(table)
  writeLocal(table, mergeById([payload], rows))
  return payload
}

export async function updateV47Row(table: V47TableName, id: string, patch: any) {
  const payload = { ...patch, updated_at: new Date().toISOString() }

  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single()
      if (!error) return data || { id, ...payload }
    } catch (error) {
      reportClientError('v47_update_row_failed', error, { table, id })
    }
  }

  const rows = readLocal(table)
  const next = rows.map((row: any) => String(row.id) === String(id) ? { ...row, ...payload } : row)
  writeLocal(table, next)
  return next.find((row: any) => String(row.id) === String(id)) || { id, ...payload }
}

export async function loadV47Context(): Promise<V47Context> {
  const base = await loadValueContext()
  const v47Entries = await Promise.all(v47Tables.map(async (t) => [t, await selectV47Table(t)]))
  return { ...base, ...Object.fromEntries(v47Entries) } as V47Context
}

export function rowsForCustomer(rows: any[] = [], customerId: string) {
  return rows.filter((row) => matchesCustomer(row, customerId))
}

export function firstCustomer(ctx: V47Context, customerId?: string) {
  return (ctx.customers || []).find((c: any) => String(c.id) === String(customerId)) || (ctx.customers || [])[0] || {}
}

export function createHeatmapGrid(ctx: V47Context, customerId: string) {
  const stored = rowsForCustomer(ctx.v47_heatmap_points || [], customerId)
  if (stored.length) return stored
  const seo = rowsForCustomer(ctx.seo_snapshots || [], customerId)
  const baseRank = Number(seo[0]?.position || 8)
  const keyword = seo[0]?.keyword || 'lokale suche'
  const areas = ['Nord', 'West', 'Zentrum', 'Ost', 'Sued', 'Umkreis 5km', 'Umkreis 10km', 'Innenstadt', 'Bahnhof']
  return areas.map((area, index) => {
    const rank = Math.max(1, Math.min(20, baseRank + ((index % 4) - 1)))
    return {
      id: `virtual_heat_${customerId}_${index}`,
      customer_id: customerId,
      keyword,
      area_label: area,
      rank,
      visibility: Math.max(10, 100 - rank * 5),
      recommendation: rank <= 3 ? 'stark halten' : rank <= 8 ? 'optimieren' : 'dringend bearbeiten'
    }
  })
}

export function buildSlugHubUrl(customer: any) {
  const slug = String(customer?.slug || customer?.name || customer?.id || 'kunde')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return buildPublicUrl(`/hub/${slug}`)
}

export function calculateHealth(ctx: V47Context, customerId: string) {
  const value = calculateCustomerValue(ctx as any, customerId)
  const events = rowsForCustomer(ctx.v47_customer_health_events || [], customerId)
  const access = rowsForCustomer(ctx.v47_tool_access_rules || [], customerId)
  const riskEvents = events.filter((e) => String(e.type || '').toLowerCase().includes('risiko')).length
  const activeTools = access.filter((a) => String(a.status || '').toLowerCase() !== 'gesperrt').length
  const score = Math.max(0, Math.min(100, Math.round(value.valueScore + activeTools * 2 - riskEvents * 8)))
  const status = score >= 75 ? 'Stabil / Upsell moeglich' : score >= 50 ? 'Beobachten' : 'Kuendigungsrisiko'
  return { ...value, healthScore: score, healthStatus: status, riskEvents, activeTools }
}

export function buildOfferFromCustomer(ctx: V47Context, customerId: string) {
  const value = calculateCustomerValue(ctx as any, customerId)
  const current = Number(value.valueScore || 0)
  const recommendedPackage = current < 45 ? 'Growth' : current < 75 ? 'Premium' : 'Premium + Add-ons'
  const setupFee = recommendedPackage === 'Growth' ? 749 : 1199
  const monthly = recommendedPackage === 'Growth' ? 299 : 499
  return {
    customer_id: customerId,
    customer_name: customerName(ctx.customers || [], customerId),
    title: `Angebot ${recommendedPackage}`,
    package_name: recommendedPackage,
    monthly_price: monthly,
    setup_fee: setupFee,
    value_score: current,
    reason: value.recommendations?.[0] || 'Paket auf Basis aktueller MMOS-Daten empfohlen.',
    services: ['Google Sichtbarkeit', 'Reviews/Reputation', 'QR/Loyalty', 'Reporting', 'Value Dashboard']
  }
}

export function buildMiniAuditFromLead(lead: any) {
  const reviews = Number(lead?.reviews || 0)
  const rating = Number(lead?.rating || 0)
  const score = Math.max(20, Math.min(95, 85 - Math.min(reviews, 200) / 8 + (rating < 4.2 ? 8 : 0)))
  const findings = [
    reviews < 50 ? 'Bewertungsbasis ist ausbaufähig.' : 'Bewertungsbasis vorhanden, Antwortquote prüfen.',
    rating < 4.3 ? 'Sternebewertung bietet Optimierungspotenzial.' : 'Gute Bewertung als Vertrauenssignal stärker nutzen.',
    'Google Business, QR-Kampagne und Kundenbindung als erstes prüfen.'
  ]
  return {
    lead_id: lead?.id || '',
    customer_id: lead?.customer_id || '',
    business_name: lead?.name || 'Neuer Lead',
    city: lead?.city || '',
    branch: lead?.branch || '',
    audit_score: Math.round(score),
    findings,
    recommended_package: score < 65 ? 'Growth' : 'Starter'
  }
}
