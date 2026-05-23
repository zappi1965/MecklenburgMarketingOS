"use client"

import { useEffect, useState } from 'react'

export default function CookieSettingsPage() {
  const [analytics, setAnalytics] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      setAnalytics(window.localStorage.getItem('mmos_cookie_analytics') === 'true')
    } catch {}
  }, [])

  function save(value: boolean) {
    setAnalytics(value)
    try {
      window.localStorage.setItem('mmos_cookie_analytics', String(value))
      window.localStorage.setItem('mmos_cookie_choice_at', new Date().toISOString())
    } catch {}
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/">← Zur Startseite</a>
        <h1>Cookie- und Einwilligungseinstellungen</h1>
        <p>
          Hier kannst du steuern, ob neben technisch notwendigen Speicherungen auch optionale Analyse-/Marketingfunktionen genutzt werden dürfen.
        </p>
        <h2>Technisch notwendige Speicherung</h2>
        <p>Erforderlich für Login, Sicherheit, Portalmodus, QR-/Loyalty-Funktionen und die stabile Bereitstellung des Dienstes. Diese Speicherung ist nicht deaktivierbar.</p>
        <h2>Optionale Analyse / Marketing</h2>
        <label className="legalToggle">
          <input type="checkbox" checked={analytics} onChange={(e) => save(e.target.checked)} />
          Optionale Analyse- und Marketing-Cookies erlauben
        </label>
        <div className="row">
          <button className="btn" onClick={() => save(false)}>Nur notwendige akzeptieren</button>
          <button className="btn secondary" onClick={() => save(true)}>Alle erlauben</button>
        </div>
        {saved && <p className="legalSaved">Einstellung gespeichert.</p>}
      </section>
    </main>
  )
}
