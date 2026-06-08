'use client'

import { hasSupabase, supabase } from './supabase'
import { isDemoMode, shouldIncludeDemoRecord } from './environmentMode'
import { reportClientError } from './errorReporter'
import { loadV44Context, matchesCustomer, customerName, uid, type V44Context } from './v44FunctionalToolsClient'

export type ValueReport = {
  id: string
  customer_id: string
  customer_name: string
  period_label: string
  value_score: number
  summary: string
  metrics: Record<string, any>
  recommendations: string[]
  next_actions: string[]
  is_demo?: boolean
  created_at?: string
  updated_at?: string
}

type ValueContext = V44Context & {
  v46_value_reports?: ValueReport[]
}

function storageKey(table: string) {
  return `mmos:v46:${table}`
}

function readLocal(table: string) {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(table)) || '[]')
  } catch (error) {
    reportClientError('v46_read_local_failed', error, { table })
    return []
  }
}

function writeLocal(table: string, rows: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(table), JSON.stringify(rows))
}

function isDemoRecord(row: any) {
  return Boolean(row?.is_demo) || String(row?.customer_name || row?.name || row?.title || '').toUpperCase().startsWith('DEMO')
}

function modeFilter(rows: any[]) {
  return rows.filter(shouldIncludeDemoRecord)
}

async function selectValueReports(): Promise<ValueReport[]> {
  const localRows = readLocal('v46_value_reports')
  let remoteRows: any[] = []
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from('v46_value_reports').select('*').order('created_at', { ascending: false })
      if (!error) remoteRows = data || []
    } catch (error) {
      reportClientError('v46_select_reports_failed', error)
    }
  }
  const byId = new Map<string, ValueReport>()
  for (const row of [...remoteRows, ...localRows]) byId.set(String(row.id), row)
  return modeFilter(Array.from(byId.values())) as ValueReport[]
}

export async function loadValueContext(): Promise<ValueContext> {
  const base = await loadV44Context()
  const reports = await selectValueReports()
  return { ...base, v46_value_reports: reports }
}

export async function saveValueReport(report: Omit<ValueReport, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<ValueReport> {
  const payload: ValueReport = {
    id: report.id || uid('value_report'),
    ...report,
    is_demo: report.is_demo ?? isDemoMode(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase.from('v46_value_reports').insert(payload).select('*').single()
      if (!error) return data as ValueReport
    } catch (error) {
      reportClientError('v46_save_report_failed', error)
    }
  }

  const rows = readLocal('v46_value_reports')
  writeLocal('v46_value_reports', [payload, ...rows.filter((r: any) => String(r.id) !== String(payload.id))])
  return payload
}

export async function findValueReport(id: string): Promise<ValueReport | null> {
  const reports = await selectValueReports()
  return reports.find((r) => String(r.id) === String(id)) || null
}

export function rowsForCustomer(rows: any[] = [], customerId: string) {
  return rows.filter((row) => matchesCustomer(row, customerId))
}

function sum(rows: any[], getter: (row: any) => number) {
  return rows.reduce((acc, row) => acc + Number(getter(row) || 0), 0)
}

function avg(values: number[]) {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0)
  if (!valid.length) return 0
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function statusOpen(row: any) {
  const status = String(row?.status || '').toLowerCase()
  return !['erledigt', 'bezahlt', 'abgeschlossen', 'archiviert', 'done', 'closed'].includes(status)
}

export function calculateCustomerValue(ctx: ValueContext, customerId: string) {
  const customers = ctx.customers || []
  const customer = customers.find((c) => String(c.id) === String(customerId)) || customers[0] || {}
  const cid = String(customerId || customer.id || '')

  const qr = rowsForCustomer(ctx.qr_campaigns || [], cid)
  const reviews = rowsForCustomer(ctx.review_feedback || [], cid)
  const loyaltyCustomers = rowsForCustomer(ctx.loyalty_customers || [], cid)
  const loyaltyTx = rowsForCustomer(ctx.loyalty_transactions || [], cid)
  const rewards = rowsForCustomer(ctx.loyalty_rewards || [], cid)
  const invoices = rowsForCustomer(ctx.invoices || [], cid)
  const tickets = rowsForCustomer(ctx.tickets || [], cid)
  const seo = rowsForCustomer(ctx.seo_snapshots || [], cid)
  const listings = rowsForCustomer(ctx.local_listings || [], cid)
  const slots = rowsForCustomer(ctx.booking_slots || [], cid)
  const waitlist = rowsForCustomer(ctx.booking_waitlist || [], cid)
  const messages = rowsForCustomer(ctx.unified_messages || [], cid)
  const paymentLinks = rowsForCustomer(ctx.payment_links || [], cid)
  const vouchers = rowsForCustomer(ctx.voucher_products || [], cid)
  const referrals = rowsForCustomer(ctx.referral_campaigns || [], cid)
  const referralEvents = rowsForCustomer(ctx.referral_events || [], cid)
  const appointments = rowsForCustomer(ctx.appointments || [], cid)
  const leads = rowsForCustomer(ctx.prospect_leads || [], cid)

  const qrScans = sum(qr, (r) => r.scans)
  const qrConversions = sum(qr, (r) => r.conversions)
  const conversionRate = pct(qrConversions, qrScans)

  const reviewCount = reviews.length
  const avgRating = avg(reviews.map((r) => Number(r.rating || r.stars || 0)))
  const negativeFeedback = reviews.filter((r) => Number(r.rating || r.stars || 5) <= 3).length

  const avgSeoPosition = avg(seo.map((s) => Number(s.position || s.rank || 0)))
  const avgVisibility = avg(seo.map((s) => Number(s.visibility || s.score || 0)))
  const bestKeyword = [...seo].sort((a, b) => Number(a.position || 999) - Number(b.position || 999))[0]?.keyword || '-'

  const avgNapScore = avg(listings.map((l) => Number(l.nap_score || 0)))
  const listingIssues = listings.filter((l) => ['Fehlerhaft', 'Zu pruefen', 'Doppelt'].includes(String(l.status))).length

  const openInvoices = invoices.filter(statusOpen)
  const openInvoiceAmount = sum(openInvoices, (i) => i.amount || i.total || 0)
  const openTickets = tickets.filter(statusOpen).length
  const openMessages = messages.filter(statusOpen).length
  const waitlistCount = waitlist.filter(statusOpen).length
  const freeSlots = slots.filter((s) => String(s.status || '').toLowerCase().includes('frei')).length

  const paymentOpen = paymentLinks.filter(statusOpen).length
  const voucherValue = sum(vouchers.filter((v) => String(v.status || '').toLowerCase() === 'aktiv'), (v) => v.amount)
  const referralLeads = referralEvents.length

  const loyaltyMembers = loyaltyCustomers.length
  const loyaltyPoints = sum(loyaltyTx, (t) => t.points)
  const activeRewards = rewards.filter((r) => String(r.status || '').toLowerCase() === 'aktiv').length

  const valueScore = Math.max(0, Math.min(100,
    Math.round(
      Math.min(qrScans / 3, 20) +
      Math.min(reviewCount * 3, 15) +
      Math.min(avgVisibility / 5, 15) +
      Math.min(loyaltyMembers * 2, 12) +
      Math.min((qrConversions + referralLeads + leads.length) * 2, 18) +
      Math.min((avgNapScore || 50) / 5, 20) -
      Math.min((negativeFeedback + listingIssues + openTickets) * 2, 15)
    )
  ))

  const potentialValue = Math.round(
    qrConversions * 18 +
    referralLeads * 35 +
    leads.length * 25 +
    loyaltyMembers * 8 +
    voucherValue * 0.15
  )

  const recommendations: string[] = []
  if (reviewCount < 5) recommendations.push('Bewertungsziel setzen: mindestens 5 neue Bewertungen im Monat sammeln.')
  if (negativeFeedback > 0) recommendations.push('Kritisches Feedback als Ticket nachfassen und Rueckgewinnung vorbereiten.')
  if (avgSeoPosition > 6 || !avgSeoPosition) recommendations.push('SEO Heatmap auswerten und schwache Stadtteile/Keywords gezielt optimieren.')
  if (listingIssues > 0) recommendations.push('Fehlerhafte oder ungepruefte Listings korrigieren, damit NAP-Daten konsistent sind.')
  if (qrScans < 50) recommendations.push('QR-Code staerker am Tresen, auf Rechnung, Flyer oder Tischaufsteller platzieren.')
  if (loyaltyMembers < 10) recommendations.push('Loyalty aktiv bewerben und Reward als klaren Wiederkehrer-Anreiz platzieren.')
  if (openInvoiceAmount > 0) recommendations.push('Offene Zahlungen ueber Zahlungslink oder Mahnwesen nachfassen.')
  if (waitlistCount > 0 && freeSlots > 0) recommendations.push('Warteliste mit freien Slots abgleichen und freie Zeiten aktiv fuellen.')
  if (!recommendations.length) recommendations.push('Aktuelle Entwicklung ist stabil. Naechster Hebel: Premium-Automationen und Monatsreport aktiv nutzen.')

  const nextActions = recommendations.slice(0, 4).map((r, i) => `${i + 1}. ${r}`)

  const summary = `${customerName(customers, cid)} erreicht einen Value Score von ${valueScore}/100. Sichtbare Hebel sind ${qrScans} QR-Scans, ${reviewCount} Feedbacks/Bewertungen, ${loyaltyMembers} Loyalty-Kontakte, ${referralLeads} Empfehlungsereignisse und ein lokaler Sichtbarkeitswert von ${avgVisibility || 0}.`

  return {
    customer,
    customerId: cid,
    rows: {
      qr,
      reviews,
      loyaltyCustomers,
      loyaltyTx,
      rewards,
      invoices,
      tickets,
      seo,
      listings,
      slots,
      waitlist,
      messages,
      paymentLinks,
      vouchers,
      referrals,
      referralEvents,
      appointments,
      leads
    },
    metrics: {
      qrScans,
      qrConversions,
      conversionRate,
      reviewCount,
      avgRating,
      negativeFeedback,
      avgSeoPosition,
      avgVisibility,
      bestKeyword,
      avgNapScore,
      listingIssues,
      openInvoiceAmount,
      openTickets,
      openMessages,
      waitlistCount,
      freeSlots,
      paymentOpen,
      voucherValue,
      referralLeads,
      loyaltyMembers,
      loyaltyPoints,
      activeRewards,
      appointments: appointments.length,
      leads: leads.length,
      potentialValue
    },
    valueScore,
    summary,
    recommendations,
    nextActions
  }
}

export function buildReportPayload(ctx: ValueContext, customerId: string, periodLabel: string): Omit<ValueReport, 'id' | 'created_at' | 'updated_at'> {
  const value = calculateCustomerValue(ctx, customerId)
  return {
    customer_id: value.customerId,
    customer_name: value.customer?.name || customerName(ctx.customers || [], value.customerId),
    period_label: periodLabel,
    value_score: value.valueScore,
    summary: value.summary,
    metrics: value.metrics,
    recommendations: value.recommendations,
    next_actions: value.nextActions,
    is_demo: Boolean(value.customer?.is_demo)
  }
}
