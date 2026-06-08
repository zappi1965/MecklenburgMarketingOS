'use client'

import { useEffect, useState } from 'react'
import { gdprClient, type DsarRequest } from '@/lib/gdprClient'
import { getCurrentSession } from '@/lib/authClient'

export const dynamic = 'force-dynamic'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase()
  if (s.includes('erledigt') || s.includes('abgeschlossen')) return 'gdprBadge done'
  if (s.includes('storniert') || s.includes('abgelehnt')) return 'gdprBadge cancelled'
  if (s.includes('bearbeitung')) return 'gdprBadge active'
  return 'gdprBadge open'
}

function typeLabel(t: string) {
  if (t === 'export') return 'Auskunft / Export (Art. 15 DSGVO)'
  if (t === 'delete') return 'Löschung (Art. 17 DSGVO)'
  if (t === 'rectify') return 'Berichtigung (Art. 16 DSGVO)'
  if (t === 'restrict') return 'Einschränkung (Art. 18 DSGVO)'
  if (t === 'consent') return 'Einwilligung'
  return t
}

export default function PrivacySelfServicePage() {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<DsarRequest[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [exportNote, setExportNote] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  async function refresh() {
    setError('')
    try {
      const session = await getCurrentSession()
      if (!session?.access_token) {
        setAuthed(false)
        setLoading(false)
        return
      }
      setAuthed(true)
      const r = await gdprClient.listMyRequests()
      setRequests(r.requests || [])
    } catch (e: any) {
      setError(e?.message || 'Anfragen konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onRequestExport() {
    setBusy('export')
    setError('')
    setInfo('')
    try {
      await gdprClient.requestExport(exportNote.trim())
      setExportNote('')
      setInfo('Auskunftsanfrage wurde gespeichert. Du erhältst innerhalb von 30 Tagen eine Antwort.')
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Auskunftsanfrage fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  async function onRequestDelete() {
    if (deleteConfirm.trim().toLowerCase() !== 'löschen' && deleteConfirm.trim().toLowerCase() !== 'loeschen') {
      setError('Zur Bestätigung gib bitte das Wort "löschen" in das Bestätigungsfeld ein.')
      return
    }
    setBusy('delete')
    setError('')
    setInfo('')
    try {
      const r = await gdprClient.requestDeletion(deleteReason.trim())
      setDeleteReason('')
      setDeleteConfirm('')
      if (r.alreadyPending) {
        setInfo('Es existiert bereits ein offener Löschantrag für dein Konto.')
      } else {
        setInfo(
          `Löschantrag gespeichert. Wirksam ab ${formatDate(r.scheduled_for)}. Du kannst den Antrag bis dahin jederzeit stornieren.`
        )
      }
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Löschantrag fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  async function onCancelDelete(id: string) {
    setBusy(`cancel:${id}`)
    setError('')
    setInfo('')
    try {
      await gdprClient.cancelDeletion(id)
      setInfo('Löschantrag wurde storniert.')
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Stornierung fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  const pendingDelete = requests.find(
    (r) => r.type === 'delete' && ['Offen', 'In Bearbeitung'].includes(r.status)
  )

  return (
    <main className="gdprPage">
      <header className="gdprHeader">
        <h1>Datenschutz · Meine Rechte</h1>
        <p>
          Hier kannst du dein Recht auf Auskunft (Art. 15 DSGVO) und auf Löschung (Art. 17 DSGVO)
          selbst ausüben. Anfragen werden innerhalb der gesetzlichen Frist von 30 Tagen bearbeitet.
        </p>
      </header>

      {authed === false && (
        <div className="gdprNotice">
          <b>Bitte melde dich an.</b>
          <p>
            Diese Seite ist nur für eingeloggte Nutzer zugänglich. Auch ohne Konto kannst du deine
            Rechte ausüben — kontaktiere uns dann bitte über die im <a href="/impressum">Impressum</a>{' '}
            genannten Kontaktwege.
          </p>
        </div>
      )}

      {error && <div className="gdprAlert error" role="alert">{error}</div>}
      {info && <div className="gdprAlert info" role="status">{info}</div>}

      {authed && (
        <>
          <section className="gdprCard">
            <h2>Datenexport anfordern</h2>
            <p>
              Du erhältst eine Kopie der zu deiner Person gespeicherten Daten. Optionale Notiz, falls
              du nur bestimmte Daten benötigst:
            </p>
            <textarea
              className="gdprInput"
              rows={3}
              placeholder="Notiz (optional)"
              value={exportNote}
              onChange={(e) => setExportNote(e.target.value)}
            />
            <button
              type="button"
              className="gdprBtn primary"
              disabled={busy === 'export' || loading}
              onClick={onRequestExport}
            >
              {busy === 'export' ? 'Wird gespeichert …' : 'Auskunft anfordern'}
            </button>
          </section>

          <section className="gdprCard">
            <h2>Konto und Daten löschen</h2>
            <p>
              Dein Konto wird nach einer 30-tägigen Frist gelöscht, damit eventuelle Stornierungen
              möglich sind. Gesetzlich aufzubewahrende Daten (z.B. Rechnungen, § 147 AO) werden
              statt gelöscht zu werden anonymisiert.
            </p>
            {pendingDelete ? (
              <div className="gdprPendingBox">
                <b>Du hast bereits einen offenen Löschantrag.</b>
                <p>
                  Geplant zur Ausführung: {formatDate(pendingDelete.metadata?.scheduled_for)}.
                </p>
                <button
                  type="button"
                  className="gdprBtn secondary"
                  disabled={busy === `cancel:${pendingDelete.id}`}
                  onClick={() => onCancelDelete(pendingDelete.id)}
                >
                  {busy === `cancel:${pendingDelete.id}` ? 'Wird storniert …' : 'Löschantrag stornieren'}
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className="gdprInput"
                  rows={3}
                  placeholder="Grund (optional)"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
                <label className="gdprConfirmLabel">
                  Zur Bestätigung gib bitte das Wort <b>löschen</b> ein:
                  <input
                    className="gdprInput"
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="gdprBtn danger"
                  disabled={busy === 'delete' || loading}
                  onClick={onRequestDelete}
                >
                  {busy === 'delete' ? 'Wird gespeichert …' : 'Löschantrag stellen'}
                </button>
              </>
            )}
          </section>

          <section className="gdprCard">
            <h2>Meine Anfragen</h2>
            {loading && <div className="gdprMuted">Lade Anfragen …</div>}
            {!loading && requests.length === 0 && (
              <div className="gdprMuted">Du hast aktuell keine Datenschutz-Anfragen gestellt.</div>
            )}
            {!loading && requests.length > 0 && (
              <ul className="gdprList">
                {requests.map((r) => (
                  <li key={r.id} className="gdprListItem">
                    <div className="gdprListMain">
                      <b>{typeLabel(r.type)}</b>
                      <span className={statusBadgeClass(r.status)}>{r.status}</span>
                    </div>
                    <div className="gdprListMeta">
                      Gestellt am {formatDate(r.created_at)}
                      {r.completed_at && <> · Abgeschlossen am {formatDate(r.completed_at)}</>}
                      {r.metadata?.scheduled_for && (
                        <> · Geplante Ausführung {formatDate(String(r.metadata.scheduled_for))}</>
                      )}
                    </div>
                    {r.notes && <div className="gdprListNote">Notiz: {r.notes}</div>}
                    {r.export_url && (
                      <a className="gdprBtn secondary inline" href={r.export_url} target="_blank" rel="noreferrer">
                        Export herunterladen
                      </a>
                    )}
                    {r.type === 'delete' && ['Offen', 'In Bearbeitung'].includes(r.status) && (
                      <button
                        type="button"
                        className="gdprBtn secondary inline"
                        disabled={busy === `cancel:${r.id}`}
                        onClick={() => onCancelDelete(r.id)}
                      >
                        Stornieren
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <footer className="gdprFooter">
        <a href="/datenschutz">Datenschutzhinweise</a>
        <a href="/impressum">Impressum</a>
        <a href="/cookies">Cookie-Einstellungen</a>
      </footer>
    </main>
  )
}
