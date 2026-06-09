// Automation/Workflow-Engine.
//
// Bindet die bereits existierenden Cross-Modul-Aktionen aus
// CustomerIntelligenceService an automatische Trigger und macht sie
// per workflow_rules-Tabelle konfigurierbar.
//
// Trigger-Discovery-Modell statt Event-Hooks: Die Engine inspiziert
// regelmaessig den DB-Zustand und feuert die fehlenden Actions. Das ist
// robust gegen verpasste Events (Restarts, Replays) und braucht keine
// Aenderungen an jeder write-Stelle im Code.
//
// Idempotenz: Vor jedem Action-Run wird customer_timeline_events nach
// dem zugehoerigen event_type fuer dieselbe Quelle gepruft. Existiert ein
// Eintrag, gilt der Trigger als bereits ausgefuehrt und wird uebersprungen.

const { CustomerIntelligenceService } = require('./customerIntelligenceService')

// Liste der bekannten Default-Regeln. Werden in der DB nicht erzwungen
// (insert-on-missing), sondern hier als Fallback verwendet, falls die
// Tabelle keine passende Regel enthaelt. Eine vorhandene workflow_rule
// mit gleichem name uebersteuert den Default.
const DEFAULT_RULES = [
  {
    name: 'auto_invoice_after_appointment',
    trigger_type: 'appointment.completed',
    conditions: { skip_when_invoice_exists: true },
    actions: [{ type: 'create_invoice_from_appointment' }],
    enabled: true
  },
  {
    name: 'ticket_for_negative_review',
    trigger_type: 'review.created.low',
    conditions: { rating_lte: 3 },
    actions: [{ type: 'create_ticket_from_review' }],
    enabled: true
  },
  {
    name: 'upsell_lead_from_qr_traction',
    trigger_type: 'qr.threshold_reached',
    conditions: { min_scans: 25, min_conversions: 5 },
    actions: [{ type: 'create_upsell_lead' }],
    enabled: true
  },
  {
    name: 'monthly_intelligence_snapshot',
    trigger_type: 'month.completed',
    conditions: { with_pdf: true },
    actions: [{ type: 'create_monthly_snapshot' }],
    enabled: true
  }
]

class AutomationEngine {
  constructor(supabase) {
    this.supabase = supabase
    this.ci = new CustomerIntelligenceService(supabase)
  }

  // Returns the active config for a rule name. Database value wins over
  // the in-code default; if the rule is disabled in the database, the
  // engine skips it even if a default exists.
  async resolveRule(name) {
    if (!this.supabase) return null
    const { data } = await this.supabase
      .from('workflow_rules')
      .select('id, name, trigger_type, conditions, actions, enabled')
      .eq('name', name)
      .maybeSingle()
    if (data) return data
    return DEFAULT_RULES.find((r) => r.name === name) || null
  }

  // Returns true if a matching timeline event already exists, so the
  // action should not run again for the same source row.
  async alreadyHandled({ customer_id, event_type, source_id }) {
    if (!customer_id || !event_type) return false
    let query = this.supabase
      .from('customer_timeline_events')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('event_type', event_type)
      .limit(1)
    if (source_id) query = query.eq('source_id', source_id)
    const { data } = await query
    return Array.isArray(data) && data.length > 0
  }

  // J1 Termin -> Rechnung: completed appointments without source_appointment_id-linked invoice.
  async runAppointmentToInvoice() {
    const rule = await this.resolveRule('auto_invoice_after_appointment')
    if (!rule?.enabled) return { skipped: true, reason: 'rule_disabled' }

    const { data: appointments, error } = await this.supabase
      .from('appointments')
      .select('id, customer_id, status, price, title, completed_at, updated_at')
      .ilike('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error) throw error

    const results = []
    for (const appt of appointments || []) {
      if (!appt.customer_id) continue
      const handled = await this.alreadyHandled({
        customer_id: appt.customer_id,
        event_type: 'invoice_created_from_booking',
        source_id: appt.id
      })
      if (handled) continue
      try {
        const invoice = await this.ci.createInvoiceFromAppointment({
          appointment_id: appt.id,
          customer_id: appt.customer_id
        })
        results.push({ appointment_id: appt.id, invoice_id: invoice?.id })
      } catch (e) {
        results.push({ appointment_id: appt.id, error: e?.message || String(e) })
      }
    }
    return { rule: rule.name, processed: results.length, results }
  }

  // J3 Negative Bewertung -> Ticket.
  async runReviewToTicket() {
    const rule = await this.resolveRule('ticket_for_negative_review')
    if (!rule?.enabled) return { skipped: true, reason: 'rule_disabled' }
    const threshold = Number(rule.conditions?.rating_lte ?? 3)

    const { data: reviews, error } = await this.supabase
      .from('review_feedback')
      .select('id, customer_id, rating, created_at')
      .lte('rating', threshold)
      .gt('rating', 0)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const results = []
    for (const review of reviews || []) {
      if (!review.customer_id) continue
      const handled = await this.alreadyHandled({
        customer_id: review.customer_id,
        event_type: 'negative_review_alert',
        source_id: review.id
      })
      if (handled) continue
      try {
        const r = await this.ci.reviewWarning({ review_feedback_id: review.id })
        results.push({ review_id: review.id, ticket_id: r?.ticket?.id || null })
      } catch (e) {
        results.push({ review_id: review.id, error: e?.message || String(e) })
      }
    }
    return { rule: rule.name, processed: results.length, results }
  }

  // J7 QR-Kampagne mit Traction -> Upsell-Lead.
  async runQrUpsellLead() {
    const rule = await this.resolveRule('upsell_lead_from_qr_traction')
    if (!rule?.enabled) return { skipped: true, reason: 'rule_disabled' }
    const minScans = Number(rule.conditions?.min_scans ?? 25)
    const minConversions = Number(rule.conditions?.min_conversions ?? 5)

    const { data: campaigns, error } = await this.supabase
      .from('qr_campaigns')
      .select('id, customer_id, scans, conversions, updated_at')
      .or(`scans.gte.${minScans},conversions.gte.${minConversions}`)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const results = []
    for (const campaign of campaigns || []) {
      if (!campaign.customer_id) continue
      const handled = await this.alreadyHandled({
        customer_id: campaign.customer_id,
        event_type: 'qr_upsell_lead_created',
        source_id: campaign.id
      })
      if (handled) continue
      try {
        const r = await this.ci.qrUpsellLead({ qr_campaign_id: campaign.id })
        if (r?.skipped) continue
        results.push({ qr_campaign_id: campaign.id, lead_id: r?.lead?.id })
      } catch (e) {
        results.push({ qr_campaign_id: campaign.id, error: e?.message || String(e) })
      }
    }
    return { rule: rule.name, processed: results.length, results }
  }

  // J10 Monatlicher Snapshot: am 1. eines Monats fuer alle aktiven Kunden
  // den Vormonats-Report erzeugen.
  async runMonthlySnapshotIfDue(now = new Date()) {
    const rule = await this.resolveRule('monthly_intelligence_snapshot')
    if (!rule?.enabled) return { skipped: true, reason: 'rule_disabled' }
    if (now.getUTCDate() !== 1) return { skipped: true, reason: 'not_first_of_month' }

    const lastMonth = new Date(now)
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1)
    const periodStart = new Date(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 1).toISOString().slice(0, 10)
    const periodEnd = new Date(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0).toISOString().slice(0, 10)
    const createPdf = rule.conditions?.with_pdf !== false

    const { data: customers, error } = await this.supabase
      .from('customers')
      .select('id, status')
      .or('status.is.null,status.eq.active')
      .limit(500)
    if (error) throw error

    const results = []
    for (const customer of customers || []) {
      try {
        // Skip if snapshot exists.
        const { data: existing } = await this.supabase
          .from('customer_monthly_report_snapshots')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .maybeSingle()
        if (existing) continue

        const snap = await this.ci.monthlySnapshot({
          customer_id: customer.id,
          period_start: periodStart,
          period_end: periodEnd,
          create_pdf: createPdf
        })
        results.push({ customer_id: customer.id, snapshot_id: snap?.id })
      } catch (e) {
        results.push({ customer_id: customer.id, error: e?.message || String(e) })
      }
    }
    return { rule: rule.name, processed: results.length, results }
  }

  async runAll(now = new Date()) {
    const out = { startedAt: new Date().toISOString(), runs: {} }
    try { out.runs.appointmentToInvoice = await this.runAppointmentToInvoice() } catch (e) { out.runs.appointmentToInvoice = { error: e?.message || String(e) } }
    try { out.runs.reviewToTicket = await this.runReviewToTicket() } catch (e) { out.runs.reviewToTicket = { error: e?.message || String(e) } }
    try { out.runs.qrUpsellLead = await this.runQrUpsellLead() } catch (e) { out.runs.qrUpsellLead = { error: e?.message || String(e) } }
    try { out.runs.monthlySnapshot = await this.runMonthlySnapshotIfDue(now) } catch (e) { out.runs.monthlySnapshot = { error: e?.message || String(e) } }
    out.finishedAt = new Date().toISOString()
    return out
  }
}

module.exports = { AutomationEngine, DEFAULT_RULES }
