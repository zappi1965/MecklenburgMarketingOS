'use client'

import { useEffect, useState } from 'react'
import ToolAccessGate from '@/components/security/ToolAccessGate'
import { getCurrentUserProfile } from '@/lib/authClient'
import { endcustomerReferralClient, LoyaltyReferral, ReferralStats } from '@/lib/endcustomerReferralClient'

export default function ReferralAdmin() {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>({})
  const [referrals, setReferrals] = useState<LoyaltyReferral[]>([])
  const [stats, setStats] = useState<ReferralStats>({ total: 0, pending: 0, credited: 0, rejected: 0 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    const profile: any = await getCurrentUserProfile()
    const cid = profile?.customer_id
    if (!cid) return
    setCustomerId(cid)
    try {
      const res = await endcustomerReferralClient.list(cid)
      setSettings(res.settings || {})
      setReferrals(res.referrals || [])
      setStats(res.stats || { total: 0, pending: 0, credited: 0, rejected: 0 })
    } catch (e: any) {
      setMsg(e?.message || 'Laden fehlgeschlagen.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function save() {
    if (!customerId) return
    setSaving(true)
    setMsg(null)
    try {
      await endcustomerReferralClient.saveSettings(customerId, {
        referral_bonus_referrer: Number(settings.referral_bonus_referrer ?? 100),
        referral_bonus_friend: Number(settings.referral_bonus_friend ?? 50),
        referral_require_friend_scan: settings.referral_require_friend_scan !== false,
        referral_self_referral_blocked: settings.referral_self_referral_blocked !== false,
        referral_max_per_referrer: Number(settings.referral_max_per_referrer ?? 0)
      })
      setMsg('Einstellungen gespeichert.')
    } catch (e: any) {
      setMsg(e?.message || 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ToolAccessGate toolKey="referral_program">
      <div className="adminPage">
        <header className="adminHeader">
          <h1>Empfehlungsprogramm</h1>
          <p>Loyalty-Mitglieder werben Freunde per persönlichem Link/QR. Beide bekommen Punkte – erst nach dem ersten echten Scan des Freundes.</p>
        </header>

        <section className="adminCard" style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
          <h2>Bonus &amp; Anti-Abuse</h2>
          <label>
            <span>Bonus für Werber (Punkte)</span>
            <input className="input" type="number" min={0} value={settings.referral_bonus_referrer ?? 100} onChange={(e) => setSettings({ ...settings, referral_bonus_referrer: e.target.value })} />
          </label>
          <label>
            <span>Bonus für geworbenen Freund (Punkte)</span>
            <input className="input" type="number" min={0} value={settings.referral_bonus_friend ?? 50} onChange={(e) => setSettings({ ...settings, referral_bonus_friend: e.target.value })} />
          </label>
          <label>
            <span>Max. Empfehlungen pro Mitglied (0 = unbegrenzt)</span>
            <input className="input" type="number" min={0} value={settings.referral_max_per_referrer ?? 0} onChange={(e) => setSettings({ ...settings, referral_max_per_referrer: e.target.value })} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={settings.referral_require_friend_scan !== false} onChange={(e) => setSettings({ ...settings, referral_require_friend_scan: e.target.checked })} />
            <span>Gutschrift erst nach erstem Scan des Freundes (empfohlen)</span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={settings.referral_self_referral_blocked !== false} onChange={(e) => setSettings({ ...settings, referral_self_referral_blocked: e.target.checked })} />
            <span>Selbst-Empfehlung blockieren</span>
          </label>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Speichern…' : 'Speichern'}</button>
          {msg ? <p style={{ opacity: 0.8 }}>{msg}</p> : null}
        </section>

        <section className="adminCard" style={{ marginTop: 16 }}>
          <h2>Empfehlungen</h2>
          <p style={{ display: 'flex', gap: 16 }}>
            <span><strong>{stats.total}</strong> gesamt</span>
            <span><strong>{stats.pending}</strong> offen</span>
            <span><strong>{stats.credited}</strong> gutgeschrieben</span>
            <span><strong>{stats.rejected}</strong> abgelehnt</span>
          </p>
          <table className="adminTable">
            <thead>
              <tr><th>Code</th><th>Freund</th><th>Status</th><th>Werber +</th><th>Freund +</th><th>Datum</th></tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td>{r.referral_code}</td>
                  <td>{r.referred_email || '–'}</td>
                  <td>{r.status}</td>
                  <td>{r.referrer_points}</td>
                  <td>{r.friend_points}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE') : '–'}</td>
                </tr>
              ))}
              {referrals.length === 0 ? <tr><td colSpan={6}>Noch keine Empfehlungen.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
    </ToolAccessGate>
  )
}
