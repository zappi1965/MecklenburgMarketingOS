'use client'

import { useEffect, useState } from 'react'
import {
  acceptAll,
  acceptEssentialOnly,
  getConsent,
  hasDecided,
  onConsentChange,
  setConsent
} from '@/lib/consent'

type Mode = 'closed' | 'banner' | 'detail'

export default function ConsentBanner() {
  const [mode, setMode] = useState<Mode>('closed')
  const [functional, setFunctional] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    if (!hasDecided()) {
      setMode('banner')
    }
    const off = onConsentChange(() => setMode('closed'))
    return () => off()
  }, [])

  useEffect(() => {
    if (mode === 'detail') {
      const c = getConsent()
      setFunctional(c.functional)
      setAnalytics(c.analytics)
      setMarketing(c.marketing)
    }
  }, [mode])

  if (mode === 'closed') return null

  return (
    <div className="mmosConsentOverlay" role="dialog" aria-modal="true" aria-label="Cookie- und Datenschutz-Einstellungen">
      <div className="mmosConsentCard">
        {mode === 'banner' && (
          <>
            <h2>Datenschutz &amp; Cookies</h2>
            <p>
              Wir verwenden technisch notwendige Speicherzugriffe, damit die Anwendung funktioniert.
              Optionale Kategorien (Funktional, Analyse, Marketing) sind standardmäßig deaktiviert
              und werden nur nach deiner Einwilligung aktiv. Du kannst deine Wahl jederzeit ändern.
            </p>
            <div className="mmosConsentActions">
              <button type="button" className="mmosConsentBtn primary" onClick={() => acceptAll()}>
                Alle akzeptieren
              </button>
              <button type="button" className="mmosConsentBtn secondary" onClick={() => acceptEssentialOnly()}>
                Nur essenziell
              </button>
              <button type="button" className="mmosConsentBtn ghost" onClick={() => setMode('detail')}>
                Einstellungen
              </button>
            </div>
            <p className="mmosConsentFootnote">
              Details: <a href="/datenschutz">Datenschutz</a> · <a href="/cookies">Cookies</a> · <a href="/impressum">Impressum</a>
            </p>
          </>
        )}

        {mode === 'detail' && (
          <>
            <h2>Cookie-Einstellungen</h2>
            <ul className="mmosConsentList">
              <li>
                <label>
                  <input type="checkbox" checked disabled />
                  <span>
                    <b>Essenziell</b>
                    <em>Notwendig für Login, Sicherheit und Grundfunktionen. Immer aktiv.</em>
                  </span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={functional}
                    onChange={(e) => setFunctional(e.target.checked)}
                  />
                  <span>
                    <b>Funktional</b>
                    <em>Speichert z.B. Geräte-Kennung für Loyalty-Funktionen und Komforteinstellungen.</em>
                  </span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                  />
                  <span>
                    <b>Analyse</b>
                    <em>Anonyme Nutzungsstatistiken zur Verbesserung der App.</em>
                  </span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                  <span>
                    <b>Marketing</b>
                    <em>Personalisierte Inhalte und Empfehlungen für dich.</em>
                  </span>
                </label>
              </li>
            </ul>
            <div className="mmosConsentActions">
              <button
                type="button"
                className="mmosConsentBtn primary"
                onClick={() => setConsent({ functional, analytics, marketing })}
              >
                Auswahl speichern
              </button>
              <button type="button" className="mmosConsentBtn secondary" onClick={() => acceptEssentialOnly()}>
                Nur essenziell
              </button>
            </div>
            <p className="mmosConsentFootnote">
              Details: <a href="/datenschutz">Datenschutz</a> · <a href="/cookies">Cookies</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
