'use client'

import { useEffect } from 'react'

const exactHelp: Record<string, { placeholder?: string; title: string }> = {
  'Suche...': {
    placeholder: 'Suchbegriff eingeben',
    title: 'Durchsuche die aktuell sichtbaren Inhalte.',
  },
  'Globale Kundensuche...': {
    placeholder: 'Kunde, Branche, Paket oder E-Mail suchen',
    title: 'Sucht live in allen geladenen Kundendatensätzen.',
  },
  'E-Mail': {
    placeholder: 'E-Mail-Adresse eingeben',
    title: 'E-Mail-Adresse für Login, Kontakt oder Benachrichtigung.',
  },
  'Passwort': {
    placeholder: 'Passwort eingeben',
    title: 'Passwort für den geschützten Zugang.',
  },
  'Name': {
    placeholder: 'Name oder Bezeichnung eingeben',
    title: 'Trage hier einen vollständigen Namen oder eine klare Bezeichnung ein.',
  },
  'Titel': {
    placeholder: 'Aussagekräftigen Titel eingeben',
    title: 'Ein kurzer, verständlicher Titel hilft bei Suche, Übersicht und Freigaben.',
  },
  'Beschreibung': {
    placeholder: 'Beschreibung oder interne Notiz eingeben',
    title: 'Beschreibe den Inhalt so, dass er später eindeutig zugeordnet werden kann.',
  },
  'Preis': {
    placeholder: 'Preis in Euro, z. B. 149',
    title: 'Betrag ohne Währungszeichen eingeben. Beispiel: 149 oder 149.99.',
  },
  'Report-Titel': {
    placeholder: 'Titel des Monatsreports, z. B. April-Report',
    title: 'So wird der Report im Kundenportal und beim Export angezeigt.',
  },
  'Executive Summary': {
    placeholder: 'Kurzfazit: Was hat sich im Monat verbessert?',
    title: 'Kurze Zusammenfassung der wichtigsten Ergebnisse für den Kunden.',
  },
  'Potenzial und Empfehlungen für den nächsten Monat': {
    placeholder: 'Nächste Maßnahmen, Chancen und Prioritäten beschreiben',
    title: 'Konkrete Empfehlungen für den kommenden Monat festhalten.',
  },
  'Mitarbeitercode / PIN': {
    placeholder: 'Code/PIN vom Mitarbeiter eingeben',
    title: 'Code wird zur Prüfung oder Einlösung im Loyalty-System verwendet.',
  },
  'unbegrenzt': {
    placeholder: 'Leer lassen = unbegrenzt',
    title: 'Trage eine Zahl ein oder lasse das Feld leer, wenn kein Limit gelten soll.',
  },
}

const keywordHelp: Array<{ match: RegExp; placeholder?: string; title: string }> = [
  {
    match: /demo|muster|fallback|beispiel|testdaten/i,
    placeholder: 'Live-Wert eingeben',
    title: 'Dieses Feld wurde für den Live-Betrieb bereinigt. Bitte echte Kundendaten verwenden.',
  },
  {
    match: /kunde/i,
    title: 'Wähle oder suche den Kunden, dessen Live-Daten in diesem Modul bearbeitet werden sollen.',
  },
  {
    match: /slug/i,
    title: 'Der Slug ist der öffentliche Kurzlink zur Kundenseite, ohne Leerzeichen und Sonderzeichen.',
  },
  {
    match: /google.*bewertung|review/i,
    title: 'Hier gehört der echte Google-Bewertungslink oder der konkrete Review-Text hinein.',
  },
  {
    match: /telefon|phone/i,
    title: 'Telefonnummer für Rückfragen, Freigaben oder Kundenkontakt.',
  },
  {
    match: /url|link/i,
    title: 'Vollständigen Link mit https:// eintragen, sofern es sich um eine externe Adresse handelt.',
  },
  {
    match: /email|e-mail/i,
    title: 'E-Mail-Adresse für Login, Kontakt, interne Benachrichtigung oder Weiterleitung.',
  },
  {
    match: /punkt|score|limit|cooldown|scan/i,
    title: 'Nur Zahlen eingeben. 0 bedeutet in diesem System meist: keine Begrenzung.',
  },
  {
    match: /beschreibung|summary|fazit|empfehlung/i,
    title: 'Kurzen, verständlichen Text schreiben. Er kann später in Reports, Freigaben oder Portalen erscheinen.',
  },
]

function enhanceField(field: HTMLInputElement | HTMLTextAreaElement) {
  const raw = field.getAttribute('placeholder') || ''
  const placeholder = raw.trim()
  if (!field.getAttribute('aria-label')) {
    field.setAttribute('aria-label', placeholder || field.name || 'Eingabefeld')
  }

  const exact = exactHelp[placeholder]
  if (exact) {
    if (exact.placeholder) field.setAttribute('placeholder', exact.placeholder)
    field.setAttribute('title', exact.title)
    return
  }

  const hit = keywordHelp.find((item) => item.match.test(placeholder) || item.match.test(field.name || ''))
  if (hit) {
    if (hit.placeholder && placeholder) field.setAttribute('placeholder', hit.placeholder)
    field.setAttribute('title', hit.title)
    return
  }

  if (!field.getAttribute('title') && placeholder) {
    field.setAttribute('title', placeholder)
  }
}

export default function FieldHelpEnhancer() {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]').forEach(enhanceField)
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
