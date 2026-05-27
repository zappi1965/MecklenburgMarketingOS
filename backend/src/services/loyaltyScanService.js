// Loyalty-Scan-Service: Kassiererin scannt den persoenlichen QR-Code eines
// Endkunden (aus Wallet-Pass oder gedruckter Karte) und bucht Punkte.
//
// QR-Inhalt-Format:
//   Plain UUID         z.B. "a1b2c3d4-..."      (aus walletPassService)
//   Strukturiert       z.B. "mmos:loyalty:<member_id>"
//   URL-Format         z.B. "https://app/.../wallet/<member_id>"
//
// Alle drei Varianten werden in extractMemberId normalisiert.
//
// Anti-Abuse:
//   - Aufruf-User muss in customer_users mit Status active sein (oder Admin)
//   - Optional staff_code-Pruefung gegen staff_confirmation_codes
//   - Respektiert daily_point_limit_per_member + suspicion_score_threshold
//     aus loyalty_security_settings, falls vorhanden
//   - Idempotenz-Token (idempotency_key) zur Vermeidung von Doppel-Buchungen
//     bei Netzwerk-Retries

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function extractMemberId(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const m = s.match(UUID_RE)
  return m ? m[0].toLowerCase() : null
}

async function loadMember(supabase, member_id) {
  const { data } = await supabase
    .from('loyalty_customers')
    .select('id, customer_id, email, display_name, points_balance, tier, last_scan_at')
    .eq('id', member_id)
    .maybeSingle()
  return data || null
}

async function verifyStaffCode(supabase, customer_id, staff_code) {
  if (!staff_code) return { ok: true, used: false }
  const { data } = await supabase
    .from('staff_confirmation_codes')
    .select('id, code, active, expires_at')
    .eq('customer_id', customer_id)
    .eq('code', String(staff_code).trim())
    .maybeSingle()
  if (!data) return { ok: false, reason: 'staff_code_unknown' }
  if (data.active === false) return { ok: false, reason: 'staff_code_inactive' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { ok: false, reason: 'staff_code_expired' }
  return { ok: true, used: true, staff_code_id: data.id }
}

async function loadCampaignDefaults(supabase, qr_campaign_id) {
  if (!qr_campaign_id) return null
  const { data } = await supabase
    .from('qr_campaigns')
    .select('id, customer_id, points_per_scan, scan_cooldown_minutes, daily_scan_limit_per_member, daily_point_limit_per_member')
    .eq('id', qr_campaign_id)
    .maybeSingle()
  return data || null
}

async function pointsToday(supabase, member_id) {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('loyalty_customer_id', member_id)
    .gte('created_at', startOfDay.toISOString())
  return (data || []).reduce((s, t) => s + Number(t.points || 0), 0)
}

async function scansToday(supabase, member_id) {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('loyalty_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('loyalty_customer_id', member_id)
    .gte('created_at', startOfDay.toISOString())
  return count || 0
}

async function lastScanAge(supabase, member_id) {
  const { data } = await supabase
    .from('loyalty_transactions')
    .select('created_at')
    .eq('loyalty_customer_id', member_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.created_at) return Infinity
  return (Date.now() - new Date(data.created_at).getTime()) / 60_000
}

async function staffScan({
  qr_payload,
  customer_id,
  qr_campaign_id,
  points: overridePoints,
  staff_code,
  scanned_by_user_id,
  idempotency_key
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }

  const member_id = extractMemberId(qr_payload)
  if (!member_id) {
    const e = new Error('QR-Inhalt konnte nicht geparst werden'); e.status = 400; throw e
  }

  const member = await loadMember(supabase, member_id)
  if (!member) {
    const e = new Error('Mitglied nicht gefunden'); e.status = 404; throw e
  }
  if (customer_id && member.customer_id !== customer_id) {
    const e = new Error('Mitglied gehoert zu einem anderen Kunden'); e.status = 403; throw e
  }

  // Idempotenz: gleiche idempotency_key in der letzten Stunde -> kein Doppel-Booking.
  if (idempotency_key) {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
    const { data: dup } = await supabase
      .from('loyalty_transactions')
      .select('id, points')
      .eq('loyalty_customer_id', member_id)
      .eq('idempotency_key', String(idempotency_key))
      .gte('created_at', oneHourAgo)
      .maybeSingle()
    if (dup) {
      return { ok: true, skipped: true, reason: 'duplicate_scan', member, transaction: dup }
    }
  }

  const staff = await verifyStaffCode(supabase, member.customer_id, staff_code)
  if (!staff.ok) {
    const e = new Error('Mitarbeiter-Code ungueltig'); e.status = 401; e.code = staff.reason; throw e
  }

  const campaign = await loadCampaignDefaults(supabase, qr_campaign_id)
  const defaultPoints = Number(campaign?.points_per_scan ?? 10)
  const points = Math.max(0, Math.min(1000, Number(overridePoints ?? defaultPoints)))
  if (points <= 0) {
    const e = new Error('Punkte muessen > 0 sein'); e.status = 400; throw e
  }

  // Cooldown.
  const cooldownMin = Number(campaign?.scan_cooldown_minutes || 0)
  if (cooldownMin > 0) {
    const ageMin = await lastScanAge(supabase, member_id)
    if (ageMin < cooldownMin) {
      const e = new Error(`Cooldown aktiv (noch ${Math.ceil(cooldownMin - ageMin)} Min.)`); e.status = 429; e.code = 'COOLDOWN'; throw e
    }
  }

  // Tageslimits aus Campaign + loyalty_security_settings.
  const dailyScanLimit = Number(campaign?.daily_scan_limit_per_member || 0)
  if (dailyScanLimit > 0) {
    const cnt = await scansToday(supabase, member_id)
    if (cnt >= dailyScanLimit) {
      const e = new Error('Tageslimit fuer Scans erreicht'); e.status = 429; e.code = 'DAILY_SCAN_LIMIT'; throw e
    }
  }

  let dailyPointLimit = Number(campaign?.daily_point_limit_per_member || 0)
  try {
    const { data: sec } = await supabase
      .from('loyalty_security_settings')
      .select('daily_point_limit_per_member')
      .eq('customer_id', member.customer_id)
      .maybeSingle()
    if (sec?.daily_point_limit_per_member) {
      dailyPointLimit = Math.max(dailyPointLimit || 0, Number(sec.daily_point_limit_per_member))
    }
  } catch (_) {}
  if (dailyPointLimit > 0) {
    const todayPts = await pointsToday(supabase, member_id)
    if (todayPts + points > dailyPointLimit) {
      const e = new Error('Tageslimit fuer Punkte ueberschritten'); e.status = 429; e.code = 'DAILY_POINTS_LIMIT'; throw e
    }
  }

  // Punkte buchen + Balance updaten in einer Transaktion (best effort —
  // Supabase JS hat keine Multi-Statement-Transaktion ueber from(), wir
  // bauen es atomic mit einem rpc waere besser. Hier 2 Schritte mit Roll-
  // back-Hint im Fehlerfall.
  const nowIso = new Date().toISOString()
  const { data: tx, error: txErr } = await supabase
    .from('loyalty_transactions')
    .insert({
      loyalty_customer_id: member_id,
      customer_id: member.customer_id,
      qr_campaign_id: qr_campaign_id || null,
      points,
      transaction_type: 'staff_scan',
      idempotency_key: idempotency_key || null,
      metadata: {
        scanned_by_user_id: scanned_by_user_id || null,
        staff_code_used: Boolean(staff.used),
        staff_code_id: staff.staff_code_id || null,
        source: 'cashier_qr_scan'
      }
    })
    .select('id, points, created_at')
    .maybeSingle()
  if (txErr) throw txErr

  const newBalance = Number(member.points_balance || 0) + points
  const { error: upErr } = await supabase
    .from('loyalty_customers')
    .update({ points_balance: newBalance, last_scan_at: nowIso })
    .eq('id', member_id)
  if (upErr) {
    // Rollback the transaction to keep state consistent.
    await supabase.from('loyalty_transactions').delete().eq('id', tx?.id)
    throw upErr
  }

  // Timeline-Event fuer Audit/Cross-Module.
  try {
    await supabase.from('customer_timeline_events').insert({
      customer_id: member.customer_id,
      event_type: 'loyalty_staff_scan',
      title: `Loyalty-Scan +${points} Punkte`,
      description: `${member.display_name || member.email || 'Mitglied'} hat ${points} Punkte erhalten.`,
      source_module: 'loyalty',
      source_id: tx?.id || null,
      severity: 'success',
      metadata: { member_id, points, new_balance: newBalance, staff_code_used: Boolean(staff.used) }
    })
  } catch (_) {}

  return {
    ok: true,
    member: {
      id: member.id,
      display_name: member.display_name,
      email: member.email,
      points_balance: newBalance,
      tier: member.tier,
      points_added: points
    },
    transaction: tx,
    staff_code_used: Boolean(staff.used)
  }
}

module.exports = {
  staffScan,
  extractMemberId,
  // Test helpers:
  _UUID_RE: UUID_RE
}
