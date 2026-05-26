'use client'

import { useEffect, useState } from 'react'
import {
  automationClient,
  type AutomationRule,
  type AutomationRunResult
} from '@/lib/automationClient'
import { getCurrentUserProfile } from '@/lib/authClient'

export const dynamic = 'force-dynamic'

function describeTrigger(trigger: string): string {
  const map: Record<string, string> = {
    'appointment.completed': 'Termin wurde als abgeschlossen markiert',
    'review.created.low': 'Bewertung mit niedriger Sternezahl eingegangen',
    'qr.threshold_reached': 'QR-Kampagne hat Schwellenwert ueberschritten',
    'month.completed': '1. eines Monats — Vormonatsreport faellig'
  }
  return map[trigger] || trigger
}

function describeAction(actionType: string): string {
  const map: Record<string, string> = {
    create_invoice_from_appointment: 'Rechnung aus Termin erzeugen',
    create_ticket_from_review: 'Ticket fuer negative Bewertung anlegen',
    create_upsell_lead: 'Upsell-Lead in der Pipeline anlegen',
    create_monthly_snapshot: 'Monatsreport-Snapshot inkl. PDF erzeugen'
  }
  return map[actionType] || actionType
}

function describeRule(rule: AutomationRule): string {
  const labels: Record<string, string> = {
    auto_invoice_after_appointment: 'Termin abgeschlossen → Rechnung erzeugen',
    ticket_for_negative_review: 'Negative Bewertung → Ticket erstellen',
    upsell_lead_from_qr_traction: 'QR-Kampagne laeuft heiss → Upsell-Lead anlegen',
    monthly_intelligence_snapshot: 'Monatlicher Customer-Intelligence-Report'
  }
  return labels[rule.name] || rule.name
}

export default function AutomationsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<AutomationRunResult | null>(null)

  async function refresh() {
    setError('')
    try {
      const profile = await getCurrentUserProfile()
      if (!profile) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      const r = await automationClient.listRules()
      setRules(r.rules || [])
    } catch (e: any) {
      setError(e?.message || 'Regeln konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onToggle(rule: AutomationRule) {
    setBusy(`toggle:${rule.name}`)
    setError('')
    setInfo('')
    try {
      await automationClient.toggleRule(rule.name, !rule.enabled)
      setInfo(`Regel "${describeRule(rule)}" ist jetzt ${!rule.enabled ? 'aktiv' : 'inaktiv'}.`)
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Aenderung fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  async function onRunNow() {
    setBusy('run')
    setError('')
    setInfo('')
    setLastRun(null)
    try {
      const r = await automationClient.runNow()
      setLastRun(r.result)
      setInfo('Workflow-Lauf abgeschlossen. Ergebnisse siehe unten.')
    } catch (e: any) {
      setError(e?.message || 'Lauf fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="autoPage">
      <header className="autoHeader">
        <h1>Workflows</h1>
        <p>
          Diese Regeln laufen automatisch alle 15 Minuten im Hintergrund. Sie verbinden Termine,
          Bewertungen, QR-Kampagnen und Reports zu einem zusammenhaengenden System.
        </p>
      </header>

      {authorized === false && (
        <div className="autoNotice">
          <b>Admin-Zugriff erforderlich.</b>
          <p>Diese Seite ist nur fuer eingeloggte Admins zugaenglich.</p>
        </div>
      )}

      {error && <div className="autoAlert error" role="alert">{error}</div>}
      {info && <div className="autoAlert info" role="status">{info}</div>}

      {authorized && (
        <>
          <section className="autoActions">
            <button
              type="button"
              className="autoBtn primary"
              onClick={onRunNow}
              disabled={busy === 'run' || loading}
            >
              {busy === 'run' ? 'Workflows laufen …' : 'Workflows jetzt ausfuehren'}
            </button>
            <button type="button" className="autoBtn secondary" onClick={refresh} disabled={loading}>
              Aktualisieren
            </button>
          </section>

          {lastRun && (
            <section className="autoCard">
              <h2>Letzter Lauf</h2>
              <ul className="autoRunList">
                {Object.entries(lastRun.runs).map(([key, value]) => (
                  <li key={key} className="autoRunItem">
                    <b>{key}</b>
                    <span>
                      {value?.skipped
                        ? `uebersprungen (${value.reason || '—'})`
                        : value?.error
                        ? `Fehler: ${value.error}`
                        : `bearbeitet: ${value?.processed ?? 0}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="autoRunMeta">
                gestartet {new Date(lastRun.startedAt).toLocaleString('de-DE')} · fertig{' '}
                {new Date(lastRun.finishedAt).toLocaleString('de-DE')}
              </p>
            </section>
          )}

          <section className="autoCard">
            <h2>Aktive Workflows</h2>
            {loading && <div className="autoMuted">Lade Regeln …</div>}
            {!loading && rules.length === 0 && (
              <div className="autoMuted">Es sind keine Workflow-Regeln konfiguriert.</div>
            )}
            {!loading && rules.length > 0 && (
              <ul className="autoRuleList">
                {rules.map((rule) => (
                  <li key={rule.name} className="autoRuleItem">
                    <div className="autoRuleMain">
                      <div className="autoRuleHead">
                        <b>{describeRule(rule)}</b>
                        <span className={rule.enabled ? 'autoBadge on' : 'autoBadge off'}>
                          {rule.enabled ? 'aktiv' : 'inaktiv'}
                        </span>
                      </div>
                      <div className="autoRuleMeta">
                        Trigger: {describeTrigger(rule.trigger_type)}
                      </div>
                      <ul className="autoRuleActions">
                        {(rule.actions || []).map((a, i) => (
                          <li key={i}>↳ {describeAction(a.type)}</li>
                        ))}
                      </ul>
                      {Object.keys(rule.conditions || {}).length > 0 && (
                        <div className="autoRuleConditions">
                          Bedingungen: <code>{JSON.stringify(rule.conditions)}</code>
                        </div>
                      )}
                      <div className="autoRuleSource">
                        Quelle: {rule.source === 'database' ? 'in der Datenbank konfiguriert' : 'Default-Regel'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={rule.enabled ? 'autoBtn danger' : 'autoBtn primary'}
                      onClick={() => onToggle(rule)}
                      disabled={busy === `toggle:${rule.name}`}
                    >
                      {busy === `toggle:${rule.name}`
                        ? 'speichert …'
                        : rule.enabled
                        ? 'Deaktivieren'
                        : 'Aktivieren'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="autoFooter">
            <p>
              Hinweis: Toggle-Aenderungen werden in der Tabelle <code>workflow_rules</code> gespeichert
              und ueberleben Updates der Default-Konfiguration.
            </p>
          </footer>
        </>
      )}
    </main>
  )
}
