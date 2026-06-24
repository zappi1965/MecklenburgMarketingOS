'use client'

import { hasSupabase, supabase } from './supabase'
import { environmentModeLabel, isDemoMode } from './environmentMode'
import { reportClientError } from './errorReporter'
import { getV45DemoRows, isV45DemoRecord, mergeRowsById, v45DemoData } from './v45DemoData'

export type V44ModuleKey =
  | 'listing_management'
  | 'booking_utilization'
  | 'unified_inbox'
  | 'payments_vouchers'
  | 'referral_program'

export type V44TableName =
  | 'customers'
  | 'appointments'
  | 'tickets'
  | 'review_feedback'
  | 'prospect_leads'
  | 'qr_campaigns'
  | 'loyalty_rewards'
  | 'loyalty_customers'
  | 'loyalty_transactions'
  | 'invoices'
  | 'seo_snapshots'
  | 'integrations'
  | 'competitor_benchmarks'
  | 'local_listings'
  | 'booking_slots'
  | 'booking_waitlist'
  | 'rebooking_reminders'
  | 'unified_messages'
  | 'payment_links'
  | 'voucher_products'
  | 'referral_campaigns'
  | 'referral_events'

export const existingDataTables: V44TableName[] = [
  'customers',
  'appointments',
  'tickets',
  'review_feedback',
  'prospect_leads',
  'qr_campaigns',
  'loyalty_rewards',
  'loyalty_customers',
  'loyalty_transactions',
  'invoices',
  'seo_snapshots',
  'integrations',
  'competitor_benchmarks'
]

export const v44DataTables: V44TableName[] = [
  'local_listings',
  'booking_slots',
  'booking_waitlist',
  'rebooking_reminders',
  'unified_messages',
  'payment_links',
  'voucher_products',
  'referral_campaigns',
  'referral_events'
]

export const allV45Tables: V44TableName[] = [...existingDataTables, ...v44DataTables]

export type V44Context = Record<V44TableName, any[]>

export function uid(prefix = 'v44') {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `${prefix}_${random}`
}

function demoActive() {
  try {
    return isDemoMode()
  } catch (error) {
    reportClientError('v44_demo_mode_failed', error)
    return false
  }
}

function storageKey(table: string) {
  return `mmos:v45:${table}`
}

function localFallbackAllowed() {
  if (demoActive()) return true
  try {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) return true
  } catch {}
  return process.env.NEXT_PUBLIC_ENABLE_LOCAL_WRITE_FALLBACK === 'true'
}

function assertLiveStorageAllowed(table: string) {
  if (localFallbackAllowed()) return
  throw new Error(`Live-Speicherung für ${table} fehlgeschlagen: kein LocalStorage-Fallback im Livebetrieb. Bitte Backend/Supabase prüfen.`)
}

function isDeletedOrArchived(row: any) {
  const status = String(row?.status || '').toLowerCase()
  return row?.is_deleted === true || row?.deleted === true || row?.archived === true || Boolean(row?.deleted_at || row?.archived_at || row?.removed_at) || ['deleted','gelöscht','geloescht','archived','archiviert','removed'].includes(status)
}

function readLocal(table: string) {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(table)) || '[]')
  } catch (error) {
    reportClientError('v44_read_local_failed', error, { table })
    return []
  }
}

function writeLocal(table: string, rows: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(table), JSON.stringify(rows))
}

function filterByMode(rows: any[]) {
  if (demoActive()) return rows.filter(isV45DemoRecord)
  return rows.filter((row) => !isV45DemoRecord(row))
}

async function selectRemote(table: V44TableName): Promise<any[]> {
  if (!hasSupabase || !supabase) return []
  try {
    const { data, error } = await supabase.from(table).select('*')
    if (!error) return data || []
  } catch {}
  return []
}

export async function selectTable(table: V44TableName): Promise<any[]> {
  const remoteRows = (await selectRemote(table)).filter((row) => !isDeletedOrArchived(row))
  const localRows = localFallbackAllowed() ? readLocal(table).filter((row: any) => !isDeletedOrArchived(row)) : []
  const demoRows = getV45DemoRows(table)

  if (demoActive()) {
    return mergeRowsById(
      demoRows,
      remoteRows.filter(isV45DemoRecord),
      localRows.filter(isV45DemoRecord)
    )
  }

  return mergeRowsById(
    remoteRows.filter((row) => !isV45DemoRecord(row)),
    localRows.filter((row) => !isV45DemoRecord(row))
  )
}

export async function insertRow(table: V44TableName, row: any): Promise<any> {
  const payload = {
    id: row.id || uid(table),
    ...row,
    is_demo: row.is_demo ?? demoActive(),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from(table).insert(payload).select('*').single()
      if (!error) return data || payload
    } catch (error) {
      reportClientError('v44_insert_remote_failed', error, { table })
    }
  }

  assertLiveStorageAllowed(table)
  const rows = readLocal(table)
  writeLocal(table, mergeRowsById([payload], rows))
  return payload
}

export async function updateRow(table: V44TableName, id: string, patch: any): Promise<any> {
  const payload = { ...patch, updated_at: new Date().toISOString() }

  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single()
      if (!error) return data || { id, ...payload }
    } catch (error) {
      reportClientError('v44_update_remote_failed', error, { table, id })
    }
  }

  assertLiveStorageAllowed(table)
  const rows = readLocal(table)
  const next = rows.map((row: any) => String(row.id) === String(id) ? { ...row, ...payload } : row)
  writeLocal(table, next)
  return next.find((row: any) => String(row.id) === String(id)) || { id, ...payload }
}

export async function upsertLocalDemoData() {
  for (const [table, rows] of Object.entries(v45DemoData)) {
    const existing = readLocal(table)
    writeLocal(table, mergeRowsById(rows as any[], existing))
  }
}

export function clearLocalDemoData() {
  for (const table of Object.keys(v45DemoData)) {
    const existing = readLocal(table)
    writeLocal(table, existing.filter((row: any) => !isV45DemoRecord(row)))
  }
}

export async function loadV44Context(): Promise<V44Context> {
  const entries = await Promise.all(allV45Tables.map(async (table) => [table, await selectTable(table as V44TableName)]))
  return Object.fromEntries(entries) as V44Context
}

export async function demoCounts() {
  const counts: Record<string, number> = {}
  for (const table of allV45Tables) {
    const rows = await selectTable(table)
    counts[table] = rows.filter(isV45DemoRecord).length
  }
  return counts
}

export function customerName(customers: any[], customerId: string) {
  return customers.find((c) => String(c.id) === String(customerId))?.name || 'Kein Kunde'
}

export function matchesCustomer(row: any, customerId: string) {
  if (!customerId) return true
  const sCid = String(customerId)
  if (row.customer_id && String(row.customer_id) === sCid) return true
  if (row.customerId && String(row.customerId) === sCid) return true
  if (row.client_customer_id && String(row.client_customer_id) === sCid) return true
  if (row.owner_customer_id && String(row.owner_customer_id) === sCid) return true
  if (row.related_customer_id && String(row.related_customer_id) === sCid) return true
  return false
}

export function buildPublicUrl(path: string) {
  if (typeof window === 'undefined') return path
  if (/^https?:\/\//i.test(path)) return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function summarizeStatus(rows: any[], statusKey = 'status') {
  return rows.reduce((acc: Record<string, number>, row) => {
    const key = String(row?.[statusKey] || 'Offen')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

export function currentModeLabel() {
  return environmentModeLabel()
}
