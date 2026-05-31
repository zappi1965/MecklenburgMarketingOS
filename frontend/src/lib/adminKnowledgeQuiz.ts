export type QuizCategory =
  | 'foundation'
  | 'crm'
  | 'sales'
  | 'google'
  | 'reviews'
  | 'automation'
  | 'content'
  | 'loyalty'
  | 'reports'
  | 'finance'
  | 'operations'
  | 'privacy'

export type QuizQuestion = {
  id: string
  category: QuizCategory
  difficulty: 'basis' | 'fortgeschritten' | 'vertrieb'
  question: string
  options: string[]
  correctIndices: number[]
  explanation: string
  answerMeta?: {
    shuffled?: boolean
    distractors?: string
  }
}

export const CATEGORY_LABELS: Record<QuizCategory, string> = {
  foundation: "Grundlogik & Rollen",
  crm: "CRM, Pipeline & Kunden",
  sales: "Vertrieb & Angebote",
  google: "Google, SEO & Sichtbarkeit",
  reviews: "Reviews & Reputation",
  automation: "Automation & Workflows",
  content: "Content, Social & Mail",
  loyalty: "QR, Loyalty & Booking",
  reports: "Reports, Media & Dokumente",
  finance: "Finanzen & Abrechnung",
  operations: "Betrieb, Health & Qualität",
  privacy: "Datenschutz & Sicherheit"
}

export const ADMIN_KNOWLEDGE_QUESTIONS: QuizQuestion[] = [
  {
    id: "internal-os",
    category: "foundation",
    difficulty: "basis",
    question: "Was ist MMOS im Geschäftsmodell von Mecklenburg Marketing?",
    options: [
      "Ein internes Betriebssystem für Akquise, Kundenbetreuung, Reports und Prozesse",
      "Ein öffentlich verkaufter SaaS-Zugang für jeden Kunden",
      "Ein reines Kassensystem",
      "Ein Steuerprogramm"
    ],
    correctIndices: [0],
    explanation: "MMOS ist intern. Kunden bekommen nur freigegebene Kundenportal-Funktionen und Ergebnisse."
  },
  {
    id: "customer-portal-role",
    category: "foundation",
    difficulty: "basis",
    question: "Was darf ein Kunde im Kundenportal grundsätzlich sehen?",
    options: [
      "Eigene Reports, Rechnungen, Tickets, freigegebene Tools und Ergebnisse",
      "Alle Admin-Generatoren",
      "Alle Kundendaten anderer Kunden",
      "Backend-Logs und API-Keys"
    ],
    correctIndices: [0],
    explanation: "Das Portal ist eine begrenzte Kundensicht, keine Admin-Oberfläche."
  },
  {
    id: "admin-only",
    category: "foundation",
    difficulty: "basis",
    question: "Welche Bereiche sind admin-only?",
    options: [
      "Mini Audit Generator",
      "Lead Engine",
      "Angebots-/Vertragsgenerator",
      "Kundenreport ansehen"
    ],
    correctIndices: [0, 1, 2],
    explanation: "Interne Akquise-, Sales- und Generator-Werkzeuge bleiben im Adminbereich."
  },
  {
    id: "tool-access-pro",
    category: "foundation",
    difficulty: "fortgeschritten",
    question: "Wofür ist Tool-Freigaben Pro da?",
    options: [
      "Pro Kunde/Paket festlegen, welche Funktionen sichtbar und nutzbar sind",
      "Kunden Adminrechte geben",
      "Google API-Kosten abschalten",
      "Datenschutztexte löschen"
    ],
    correctIndices: [0],
    explanation: "Tool-Freigaben sichern Paketlogik und Zugriffstrennung."
  },
  {
    id: "tenant-isolation",
    category: "foundation",
    difficulty: "fortgeschritten",
    question: "Was bedeutet Tenant-Isolation?",
    options: [
      "Jeder Kunde sieht nur eigene Daten; Admin darf intern übergreifend arbeiten",
      "Alle Kunden teilen sich eine offene Datenansicht",
      "Nur Leads werden getrennt",
      "Nur PDFs werden getrennt"
    ],
    correctIndices: [0],
    explanation: "Tenant-Isolation schützt Kundendaten vor Fremdzugriff."
  },
  {
    id: "crm-purpose",
    category: "crm",
    difficulty: "basis",
    question: "Wofür ist das CRM im MMOS gedacht?",
    options: [
      "Kunden, Leads, Kontakte, Status, Pipeline und Historie zentral verwalten",
      "Nur Social-Media-Posts planen",
      "Nur Rechnungen drucken",
      "Google Maps ersetzen"
    ],
    correctIndices: [0],
    explanation: "CRM ist die zentrale Kunden- und Lead-Datenbasis."
  },
  {
    id: "crm-status",
    category: "crm",
    difficulty: "basis",
    question: "Warum sind Statusfelder im CRM wichtig?",
    options: [
      "Damit klar ist, ob ein Kontakt Lead, Angebot, Kunde, gefährdet oder abgeschlossen ist",
      "Damit Logos automatisch größer werden",
      "Damit Google-Bewertungen gelöscht werden",
      "Damit Cookies akzeptiert werden"
    ],
    correctIndices: [0],
    explanation: "Statusfelder machen Pipeline und nächste Schritte sichtbar."
  },
  {
    id: "pipeline-purpose",
    category: "crm",
    difficulty: "basis",
    question: "Was zeigt eine Pipeline-Ansicht?",
    options: [
      "In welcher Vertriebsphase Leads/Kunden stehen",
      "Nur Wetterdaten",
      "Nur Sentry-Fehler",
      "Nur Domainkosten"
    ],
    correctIndices: [0],
    explanation: "Pipeline hilft, Akquise und Follow-ups strukturiert zu steuern."
  },
  {
    id: "customer-profile-image",
    category: "crm",
    difficulty: "basis",
    question: "Warum sind Profilbilder/Logos im Kundenprofil sinnvoll?",
    options: [
      "Für Wiedererkennung in CRM, Reports und Kundenübersichten",
      "Für bessere Google-Rankings garantiert",
      "Für weniger Datenschutzpflichten",
      "Für automatische Rechnungszahlung"
    ],
    correctIndices: [0],
    explanation: "Visuelle Zuordnung macht Arbeit im Adminbereich schneller und professioneller."
  },
  {
    id: "lead-source",
    category: "crm",
    difficulty: "basis",
    question: "Warum sollte bei Leads die Quelle erfasst werden?",
    options: [
      "Um zu sehen, ob Google, Empfehlung, Website, Facebook oder Kaltakquise funktioniert",
      "Um Passwörter zu speichern",
      "Um Backups zu löschen",
      "Um Kundenportale öffentlich zu machen"
    ],
    correctIndices: [0],
    explanation: "Leadquellen zeigen, welche Akquise-Kanäle funktionieren."
  },
  {
    id: "customer-health",
    category: "crm",
    difficulty: "fortgeschritten",
    question: "Wofür ist Customer Health gedacht?",
    options: [
      "Risiko, Zufriedenheit, Upsell-Potenzial und Betreuungsbedarf erkennen",
      "Alle Kunden automatisch kündigen",
      "Google API-Key generieren",
      "Nur Farben ändern"
    ],
    correctIndices: [0],
    explanation: "Customer Health priorisiert Betreuung und verhindert Kündigungen."
  },
  {
    id: "customer-intelligence",
    category: "crm",
    difficulty: "fortgeschritten",
    question: "Was leistet Customer Intelligence?",
    options: [
      "Kundendaten verdichten: Risiko, Chancen, Upsell, Monatsreport-Ideen",
      "Steuerbescheide erstellen",
      "Browser-Tracking ohne Consent",
      "Passwörter anzeigen"
    ],
    correctIndices: [0],
    explanation: "Customer Intelligence unterstützt strategische Kundenbetreuung."
  },
  {
    id: "support-tickets",
    category: "crm",
    difficulty: "basis",
    question: "Wofür sind Tickets/Support im Kundenportal gedacht?",
    options: [
      "Kundenanliegen strukturiert aufnehmen und nachvollziehbar bearbeiten",
      "Adminrechte verteilen",
      "Google Bewertungen kaufen",
      "Datenbanktabellen löschen"
    ],
    correctIndices: [0],
    explanation: "Tickets verhindern unübersichtliche Kommunikation über viele Kanäle."
  },
  {
    id: "mini-audit-purpose",
    category: "sales",
    difficulty: "basis",
    question: "Wofür ist der Mini Audit Generator gedacht?",
    options: [
      "Interner Akquise-Einstieg auf Basis öffentlich sichtbarer Google-Daten",
      "Kunden sollen fremde Daten exportieren",
      "Vollständiger Jahresabschluss",
      "Newsletter-Versand"
    ],
    correctIndices: [0],
    explanation: "Mini Audit = schneller Gesprächsanlass für lokale Sichtbarkeit."
  },
  {
    id: "mini-audit-google-only",
    category: "sales",
    difficulty: "basis",
    question: "Welche Datenbasis nutzt der Mini Audit primär?",
    options: [
      "Google Places / Google Business Daten",
      "Interne Loyalty-Umsätze",
      "Kundenbankdaten",
      "Browser-Cookies"
    ],
    correctIndices: [0],
    explanation: "Mini Audit bleibt Google-only und ohne MMOS-Kundendaten."
  },
  {
    id: "lead-engine",
    category: "sales",
    difficulty: "basis",
    question: "Wofür ist die Lead Engine gedacht?",
    options: [
      "Lokale potenzielle Kunden finden, bewerten und für Akquise vorbereiten",
      "Kundenrechnungen bezahlen",
      "PDFs signieren",
      "MFA deaktivieren"
    ],
    correctIndices: [0],
    explanation: "Lead Engine ist internes Akquise-Werkzeug."
  },
  {
    id: "offer-generator",
    category: "sales",
    difficulty: "basis",
    question: "Wofür ist der Angebotsgenerator gedacht?",
    options: [
      "Konsistente Angebote passend zu Paket, Bedarf und Kundennutzen erstellen",
      "Datenschutz ersetzen",
      "Kundenpasswörter verwalten",
      "Kassenbons buchen"
    ],
    correctIndices: [0],
    explanation: "Der Generator standardisiert Angebote und spart Zeit."
  },
  {
    id: "contract-generator",
    category: "sales",
    difficulty: "basis",
    question: "Wofür ist der Vertragsgenerator gedacht?",
    options: [
      "Leistungsumfang, Pflichten, Laufzeit und rechtliche Bausteine sauber vorbereiten",
      "Google Ranking garantieren",
      "Kundendaten öffentlich machen",
      "Backups löschen"
    ],
    correctIndices: [0],
    explanation: "Verträge müssen zu Paket und Leistung passen."
  },
  {
    id: "value-selling",
    category: "sales",
    difficulty: "vertrieb",
    question: "Was verkaufst du im Kundengespräch primär?",
    options: [
      "Sichtbarkeit, Vertrauen, Bewertungen, Anfragen und Kundenbindung",
      "Den Quellcode von MMOS",
      "Adminzugang",
      "Sentry-Projektzugang"
    ],
    correctIndices: [0],
    explanation: "Verkauft wird Ergebnis/Nutzen, nicht das interne System."
  },
  {
    id: "price-objection",
    category: "sales",
    difficulty: "vertrieb",
    question: "Kunde sagt: „Zu teuer.“ Was ist die beste Reaktion?",
    options: [
      "Nachfragen, woran er Preis misst, und Nutzen auf Anfragen/Umsatz zurückführen",
      "Sofort halbieren",
      "Gespräch abbrechen",
      "Mit Ranking-Garantie locken"
    ],
    correctIndices: [0],
    explanation: "Preiswiderstand wird über Bedarf und Nutzen eingeordnet."
  },
  {
    id: "pilot-positioning",
    category: "sales",
    difficulty: "vertrieb",
    question: "Wie positionierst du einen frühen Pilotkunden ehrlich?",
    options: [
      "Betreuter Start mit laufender Optimierung",
      "Fertiges Massen-SaaS ohne Betreuung",
      "Test ohne Vertrag/Datenschutz",
      "Kostenloser Adminzugang"
    ],
    correctIndices: [0],
    explanation: "Pilot = kontrollierter, betreuter Start."
  },
  {
    id: "no-guarantees",
    category: "sales",
    difficulty: "vertrieb",
    question: "Welche Aussage solltest du vermeiden?",
    options: [
      "Wir garantieren Platz 1 bei Google",
      "Wir verbessern systematisch Ihre lokale Sichtbarkeit",
      "Wir machen Fortschritte messbar",
      "Wir priorisieren Hebel"
    ],
    correctIndices: [0],
    explanation: "Ranking-Garantien sind unseriös."
  },
  {
    id: "discovery",
    category: "sales",
    difficulty: "vertrieb",
    question: "Welche Frage ist im Erstgespräch stark?",
    options: [
      "Wie gewinnen Sie aktuell neue Kunden und wo verlieren Sie Anfragen?",
      "Wie lautet Ihr Datenbankpasswort?",
      "Kennen Sie React?",
      "Wollen Sie sofort alles kaufen?"
    ],
    correctIndices: [0],
    explanation: "Discovery öffnet Bedarf und konkrete Verkaufsargumente."
  },
  {
    id: "package-fit",
    category: "sales",
    difficulty: "vertrieb",
    question: "Wie erklärst du Starter, Growth, Premium sinnvoll?",
    options: [
      "Starter = Fundament, Growth = laufende Optimierung, Premium = intensive Betreuung/Automatisierung",
      "Alle identisch",
      "Starter ist schlecht",
      "Premium ist zufällig"
    ],
    correctIndices: [0],
    explanation: "Pakete unterscheiden sich nach Intensität, Umfang und Betreuung."
  },
  {
    id: "google-business",
    category: "google",
    difficulty: "basis",
    question: "Was ist Ziel der Google Business Optimierung?",
    options: [
      "Profil vollständiger, vertrauenswürdiger und auffindbarer machen",
      "Google manipulieren",
      "Negative Bewertungen löschen",
      "Website ersetzen"
    ],
    correctIndices: [0],
    explanation: "Fokus: Auffindbarkeit, Vertrauen, Entscheidungshilfe."
  },
  {
    id: "seo-dashboard",
    category: "google",
    difficulty: "basis",
    question: "Wofür ist SEO & Sichtbarkeit gedacht?",
    options: [
      "Positionen, lokale Auffindbarkeit, Keywords und Wettbewerbsumfeld beobachten",
      "Nur Rechnungen erstellen",
      "Nur MFA aktivieren",
      "Nur Chatbots bauen"
    ],
    correctIndices: [0],
    explanation: "SEO-Dashboard zeigt Sichtbarkeit und Hebel."
  },
  {
    id: "gmb-tool",
    category: "google",
    difficulty: "basis",
    question: "Was macht das Google Business Tool im Kern?",
    options: [
      "GBP-Daten, Optimierungen, Audit-Hinweise und Sichtbarkeitsmaßnahmen bündeln",
      "Kundenportale löschen",
      "Kassenumsätze buchen",
      "Backups verschlüsseln"
    ],
    correctIndices: [0],
    explanation: "Google Business ist Kernangebot für lokale Betriebe."
  },
  {
    id: "keywords",
    category: "google",
    difficulty: "fortgeschritten",
    question: "Warum sind Keywords im Kundenprofil wichtig?",
    options: [
      "Damit Auswertungen und Maßnahmen zur tatsächlichen Suche passen",
      "Damit Rechnungen schneller bezahlt werden",
      "Damit Cookies verschwinden",
      "Damit der Admin eingeloggt bleibt"
    ],
    correctIndices: [0],
    explanation: "Keywords verbinden Angebot, Sichtbarkeit und Reporting."
  },
  {
    id: "maps-api",
    category: "google",
    difficulty: "fortgeschritten",
    question: "Warum braucht der Mini Audit Google Places API?",
    options: [
      "Für Unternehmens-/Ortsdaten, Bewertungen, Place Details und Fotos",
      "Für Stripe-Zahlungen",
      "Für Sentry-Events",
      "Für PDF-Schriftarten"
    ],
    correctIndices: [0],
    explanation: "Places liefert lokale Geschäftsdaten."
  },
  {
    id: "review-system",
    category: "reviews",
    difficulty: "basis",
    question: "Was ist Grundidee des Review-Systems?",
    options: [
      "1–3 Sterne intern auffangen, 4–5 Sterne zur öffentlichen Google-Bewertung motivieren",
      "Fake-Bewertungen erzeugen",
      "Alle Bewertungen löschen",
      "Nur 5 Sterne speichern"
    ],
    correctIndices: [0],
    explanation: "Negatives Feedback intern lösen, positives Vertrauen öffentlich stärken."
  },
  {
    id: "reputation-center",
    category: "reviews",
    difficulty: "basis",
    question: "Wofür ist das Reputation Center?",
    options: [
      "Bewertungen, Feedback und Vertrauensaufbau zentral überwachen",
      "Angebote signieren",
      "API-Keys verwalten",
      "Buchhaltung exportieren"
    ],
    correctIndices: [0],
    explanation: "Reputation ist für lokale Kaufentscheidungen zentral."
  },
  {
    id: "review-intelligence",
    category: "reviews",
    difficulty: "fortgeschritten",
    question: "Was leistet Review Intelligence?",
    options: [
      "Stimmungen, Muster, Antwortideen und Verbesserungsfelder aus Bewertungen ableiten",
      "MFA einrichten",
      "Backups starten",
      "Kassenbons auslesen"
    ],
    correctIndices: [0],
    explanation: "Bewertungen werden nicht nur gesammelt, sondern ausgewertet."
  },
  {
    id: "review-widget",
    category: "reviews",
    difficulty: "basis",
    question: "Wofür ist das Bewertungs-Widget?",
    options: [
      "Bewertungen/Feedback sichtbar und nutzbar in Seiten/Flows einbinden",
      "Google API-Kosten löschen",
      "CRM ersetzen",
      "Verträge generieren"
    ],
    correctIndices: [0],
    explanation: "Das Widget macht Reputation nutzbar."
  },
  {
    id: "workflows",
    category: "automation",
    difficulty: "basis",
    question: "Wofür sind Workflows gedacht?",
    options: [
      "Wiederkehrende Abläufe automatisieren, z.B. Follow-ups, Reports, Erinnerungen",
      "Adminrechte abschalten",
      "Zahlungen garantieren",
      "Logos entfernen"
    ],
    correctIndices: [0],
    explanation: "Automation spart Zeit und reduziert Vergessen."
  },
  {
    id: "automation-playbooks",
    category: "automation",
    difficulty: "basis",
    question: "Was sind Automation Playbooks?",
    options: [
      "Vordefinierte Automationsvorlagen für typische Prozesse",
      "Kundendatenexporte für alle",
      "Steuererklärungen",
      "Sentry-Dashboards"
    ],
    correctIndices: [0],
    explanation: "Playbooks machen Automatisierung wiederholbar."
  },
  {
    id: "trigger-action",
    category: "automation",
    difficulty: "fortgeschritten",
    question: "Was ist eine Trigger-Action-Logik?",
    options: [
      "Wenn Ereignis X passiert, wird Aktion Y ausgelöst",
      "Ein Kunde bekommt automatisch Adminrechte",
      "Alle Leads werden gelöscht",
      "Nur Designfarben wechseln"
    ],
    correctIndices: [0],
    explanation: "Trigger und Actions bilden Automationsketten."
  },
  {
    id: "ai-automation-core",
    category: "automation",
    difficulty: "fortgeschritten",
    question: "Wofür ist AI Automation Core gedacht?",
    options: [
      "KI-gestützte Prozesse und Cross-Modul-Regeln zentral steuern",
      "Nur Bierpreise kalkulieren",
      "Google Maps ersetzen",
      "Passwörter speichern"
    ],
    correctIndices: [0],
    explanation: "KI-Workflows sollen systematisch und kontrollierbar werden."
  },
  {
    id: "ai-social-posts",
    category: "content",
    difficulty: "basis",
    question: "Wofür sind AI Social-Posts?",
    options: [
      "Beiträge für Instagram, Facebook, Google, LinkedIn vorbereiten",
      "PDFs speichern",
      "MFA einrichten",
      "DSGVO löschen"
    ],
    correctIndices: [0],
    explanation: "Social-Posts unterstützen lokale Sichtbarkeit und Content-Regelmäßigkeit."
  },
  {
    id: "newsletter",
    category: "content",
    difficulty: "basis",
    question: "Wofür ist Newsletter gedacht?",
    options: [
      "Kundenkommunikation, Aktionen und Wiederbesuche fördern",
      "Tenant-Isolation testen",
      "API-Keys anzeigen",
      "Backups löschen"
    ],
    correctIndices: [0],
    explanation: "Newsletter ist Kommunikations- und Bindungskanal."
  },
  {
    id: "ai-mail-assistant",
    category: "content",
    difficulty: "basis",
    question: "Wofür ist der AI Mail-Assistant?",
    options: [
      "E-Mails/Vorlagen für Kundenkommunikation und CRM vorbereiten",
      "Google Bewertungen kaufen",
      "Sentry entfernen",
      "Buchhaltung ersetzen"
    ],
    correctIndices: [0],
    explanation: "Mail-Assistent spart Zeit und verbessert Follow-ups."
  },
  {
    id: "mail-center",
    category: "content",
    difficulty: "fortgeschritten",
    question: "Warum sind Mail-Vorlagen wichtig?",
    options: [
      "Damit Akquise, Onboarding und Follow-ups konsistent bleiben",
      "Damit alle Mails ohne Prüfung rausgehen",
      "Damit Kunden Admin werden",
      "Damit Rechnungen verschwinden"
    ],
    correctIndices: [0],
    explanation: "Vorlagen sorgen für einheitliche, schnelle Kommunikation."
  },
  {
    id: "qr-campaigns",
    category: "loyalty",
    difficulty: "basis",
    question: "Wofür sind QR-Kampagnen gedacht?",
    options: [
      "Einfache Interaktion vor Ort, Feedback, Aktionen und Kundenbindung",
      "Datenbankmigrationen",
      "MFA deaktivieren",
      "Rechnungen exportieren"
    ],
    correctIndices: [0],
    explanation: "QR ist Brücke zwischen Ladenfläche und digitalem Prozess."
  },
  {
    id: "loyalty-growth",
    category: "loyalty",
    difficulty: "basis",
    question: "Wofür ist Loyalty Growth?",
    options: [
      "Wiederbesuche und Kundenbindung systematisch stärken",
      "Backups verschieben",
      "API-Keys rotieren",
      "Verträge löschen"
    ],
    correctIndices: [0],
    explanation: "Loyalty steigert Wiederkehr und Bindung."
  },
  {
    id: "loyalty-scan",
    category: "loyalty",
    difficulty: "basis",
    question: "Wofür ist Loyalty-Scan an der Kasse?",
    options: [
      "Kunden-QR scannen und Punkte/Boni buchen",
      "Google API abrechnen",
      "Admin-Logs exportieren",
      "PDFs rendern"
    ],
    correctIndices: [0],
    explanation: "Kassennahe Loyalty-Funktion für reale Nutzung vor Ort."
  },
  {
    id: "booking",
    category: "loyalty",
    difficulty: "basis",
    question: "Wofür ist Online-Terminbuchung?",
    options: [
      "Leistungen, Zeiten und Buchungen für Kundenbetriebe digital abbilden",
      "Backups löschen",
      "Google Rankings garantieren",
      "Sentry konfigurieren"
    ],
    correctIndices: [0],
    explanation: "Booking reduziert Reibung und macht Termine messbar."
  },
  {
    id: "no-show",
    category: "loyalty",
    difficulty: "fortgeschritten",
    question: "Wofür ist No-Show-Risiko gedacht?",
    options: [
      "Risiko nicht wahrgenommener Termine erkennen und vorbeugen",
      "Negative Google-Bewertungen löschen",
      "Steuern berechnen",
      "API-Keys erstellen"
    ],
    correctIndices: [0],
    explanation: "No-Show-Logik schützt Umsatz und Planung."
  },
  {
    id: "slug-hub",
    category: "loyalty",
    difficulty: "basis",
    question: "Wofür ist der Slug-Hub?",
    options: [
      "Kunden- oder Kampagnen-Slugs für öffentliche Seiten/QR-Flows verwalten",
      "Passwörter anzeigen",
      "Backups starten",
      "MFA resetten"
    ],
    correctIndices: [0],
    explanation: "Slugs verbinden QR/öffentliche Flows mit dem passenden Kunden."
  },
  {
    id: "media-reports",
    category: "reports",
    difficulty: "basis",
    question: "Wofür ist Media & Reports?",
    options: [
      "Dokumente, PDFs, Medien und Kundenreports geordnet speichern/anzeigen",
      "Adminrollen vergeben",
      "Rechnungen bezahlen",
      "Google Bewertungen sammeln"
    ],
    correctIndices: [0],
    explanation: "Reports und Medien brauchen saubere Ablage und Freigabe."
  },
  {
    id: "document-engine",
    category: "reports",
    difficulty: "fortgeschritten",
    question: "Was leistet die Document Engine v2?",
    options: [
      "Template, Daten, PDF-Rendering, Speicherung, Metadaten und Freigabe verbinden",
      "Alle Kunden öffentlich listen",
      "Google-Kosten abschalten",
      "CRM löschen"
    ],
    correctIndices: [0],
    explanation: "Zentrale Dokumentenpipeline für Reports, Angebote, Audits."
  },
  {
    id: "monthly-report",
    category: "reports",
    difficulty: "basis",
    question: "Welchen Zweck haben Monatsreports?",
    options: [
      "Fortschritte, Maßnahmen und Ergebnisse sichtbar machen",
      "Rechnungen ersetzen",
      "Kundenzugänge löschen",
      "Adminlogs veröffentlichen"
    ],
    correctIndices: [0],
    explanation: "Reports schaffen Vertrauen und halten Wert sichtbar."
  },
  {
    id: "value-dashboard",
    category: "reports",
    difficulty: "basis",
    question: "Wofür ist das Value Dashboard?",
    options: [
      "Kundennutzen und erzielte Wirkung sichtbar machen",
      "MFA ersetzen",
      "Nur API-Kosten zeigen",
      "Nur Backups verwalten"
    ],
    correctIndices: [0],
    explanation: "Value Dashboard hilft, den Wert der Betreuung zu zeigen."
  },
  {
    id: "signed-url",
    category: "reports",
    difficulty: "fortgeschritten",
    question: "Warum sind Signed URLs für PDF-Downloads sinnvoll?",
    options: [
      "Zeitlich begrenzter Zugriff auf geschützte Dateien",
      "Öffentliche Indexierung",
      "Passwortloser Adminzugriff",
      "Google-Ranking-Garantie"
    ],
    correctIndices: [0],
    explanation: "Signed URLs schützen Dokumente und ermöglichen kontrollierte Downloads."
  },
  {
    id: "e-invoice",
    category: "finance",
    difficulty: "basis",
    question: "Wofür ist E-Rechnung gedacht?",
    options: [
      "XRechnung/ZUGFeRD für B2B-Abrechnung vorbereiten",
      "Google Ranking erhöhen",
      "Loyalty-Punkte buchen",
      "Sentry-DSN erstellen"
    ],
    correctIndices: [0],
    explanation: "E-Rechnung unterstützt korrekte digitale Abrechnung."
  },
  {
    id: "accounting-export",
    category: "finance",
    difficulty: "basis",
    question: "Wofür ist Buchhaltungs-Export?",
    options: [
      "Daten für DATEV/lexoffice/sevDesk strukturiert ausgeben",
      "Social Posts erstellen",
      "MFA aktivieren",
      "Google Fotos laden"
    ],
    correctIndices: [0],
    explanation: "Export erleichtert Buchhaltung und Steuerprozesse."
  },
  {
    id: "pos",
    category: "finance",
    difficulty: "basis",
    question: "Wofür ist Kassen-Anbindung/POS gedacht?",
    options: [
      "Transaktionen/Kassendaten in Prozesse oder Auswertungen einbeziehen",
      "Verträge signieren",
      "Cookies verwalten",
      "Backups löschen"
    ],
    correctIndices: [0],
    explanation: "POS-Daten können Umsatz- und Kundenbindungslogik stärken."
  },
  {
    id: "dunning",
    category: "finance",
    difficulty: "basis",
    question: "Wofür sind Mahnstufen?",
    options: [
      "Überfällige Zahlungen strukturiert verfolgen und erinnern",
      "Bewertungen generieren",
      "Google API drosseln",
      "Kundenportale anonymisieren"
    ],
    correctIndices: [0],
    explanation: "Mahnstufen sichern Zahlungsprozesse."
  },
  {
    id: "revenue-forecast",
    category: "finance",
    difficulty: "fortgeschritten",
    question: "Wofür ist Umsatz-Prognose?",
    options: [
      "Künftige Umsätze, Risiken und Paketpotenziale abschätzen",
      "MFA deaktivieren",
      "Reports löschen",
      "Google Rezensionen sortieren"
    ],
    correctIndices: [0],
    explanation: "Forecast unterstützt Planung und Upsell."
  },
  {
    id: "smart-pricing",
    category: "finance",
    difficulty: "fortgeschritten",
    question: "Wofür ist Smart Pricing?",
    options: [
      "Preise/Empfehlungen datenbasiert nach Bedarf, Paket und Nutzung einschätzen",
      "Alle Preise zufällig ändern",
      "Datenschutz ersetzen",
      "CRM löschen"
    ],
    correctIndices: [0],
    explanation: "Smart Pricing hilft bei fairer, wertorientierter Preisfindung."
  },
  {
    id: "health-cockpit",
    category: "operations",
    difficulty: "basis",
    question: "Wofür ist das Health-Cockpit?",
    options: [
      "System- und Kundenstatus übergreifend überwachen",
      "Google-Reviews löschen",
      "Rechnungen signieren",
      "Social Posts schreiben"
    ],
    correctIndices: [0],
    explanation: "Health-Cockpit zeigt, wo etwas Aufmerksamkeit braucht."
  },
  {
    id: "maintenance-reminder",
    category: "operations",
    difficulty: "basis",
    question: "Wofür ist Wartungs-Reminder gedacht?",
    options: [
      "Regelmäßige Checks wie Logo, Loyalty, MFA, Reports und Datenqualität anstoßen",
      "Kunden öffentlich listen",
      "Steuern berechnen",
      "Cookies erzwingen"
    ],
    correctIndices: [0],
    explanation: "Wartung verhindert schleichende Fehler."
  },
  {
    id: "onboarding-audits",
    category: "operations",
    difficulty: "basis",
    question: "Wofür sind Onboarding-Audits?",
    options: [
      "Neue Kunden systematisch auf Setup, Risiken und Chancen prüfen",
      "Backups löschen",
      "MFA deaktivieren",
      "Ranking garantieren"
    ],
    correctIndices: [0],
    explanation: "Onboarding-Audit macht Start sauber und wiederholbar."
  },
  {
    id: "insights",
    category: "operations",
    difficulty: "basis",
    question: "Wofür sind Insights?",
    options: [
      "Übergreifende Auswertungen zu Compliance, CLV, Cohorts und Entwicklung",
      "Nur ein Loginformular",
      "Nur Newsletter",
      "Nur QR-Codes"
    ],
    correctIndices: [0],
    explanation: "Insights bündeln Management-Perspektive."
  },
  {
    id: "growth-command",
    category: "operations",
    difficulty: "fortgeschritten",
    question: "Wofür ist Growth Command?",
    options: [
      "Wachstum und mehrere Geschäftsbereiche zentral steuern",
      "Passwörter resetten",
      "Storage-Buckets löschen",
      "Nur Instagram-Posts planen"
    ],
    correctIndices: [0],
    explanation: "Growth Command ist die strategische Steuerzentrale."
  },
  {
    id: "onboarding-assistant",
    category: "operations",
    difficulty: "basis",
    question: "Wofür ist der Einrichtungs-Assistent?",
    options: [
      "Geführtes Setup für Branding, QR, Loyalty und Kundengrundlagen",
      "Google Bewertungen kaufen",
      "Adminlogs löschen",
      "Bankdaten abrufen"
    ],
    correctIndices: [0],
    explanation: "Onboarding-Assistent macht Einrichtung reproduzierbar."
  },
  {
    id: "data-quality",
    category: "operations",
    difficulty: "basis",
    question: "Wofür ist Datenqualität gedacht?",
    options: [
      "Dubletten, fehlerhafte E-Mails und inkonsistente Daten erkennen",
      "Sentry ausschalten",
      "Google Ranking garantieren",
      "PDFs signieren"
    ],
    correctIndices: [0],
    explanation: "Gute Datenqualität verhindert Folgefehler."
  },
  {
    id: "demo-data",
    category: "operations",
    difficulty: "basis",
    question: "Wofür sind Demo-Daten?",
    options: [
      "Vorführungen und Tests ohne echte Kundendaten ermöglichen",
      "Echte Kundendaten veröffentlichen",
      "Backups ersetzen",
      "AVV löschen"
    ],
    correctIndices: [0],
    explanation: "Demo-Daten sind wichtig für sichere Präsentationen."
  },
  {
    id: "api-cost-control",
    category: "operations",
    difficulty: "fortgeschritten",
    question: "Wofür ist API-Kostenkontrolle?",
    options: [
      "Tages-/Monatslimits und Kostenereignisse überwachen",
      "MFA entfernen",
      "Logo skalieren",
      "CRM löschen"
    ],
    correctIndices: [0],
    explanation: "Kostenkontrolle schützt vor Überraschungen."
  },
  {
    id: "jobs",
    category: "operations",
    difficulty: "fortgeschritten",
    question: "Warum sind Background Jobs sinnvoll?",
    options: [
      "Lange Prozesse wie PDFs/Audits/Reports laufen stabiler und nachvollziehbar",
      "Jeder Kunde wird Admin",
      "Alle Daten werden öffentlich",
      "Backups werden unnötig"
    ],
    correctIndices: [0],
    explanation: "Jobs vermeiden Timeouts und zeigen Status."
  },
  {
    id: "idempotency",
    category: "operations",
    difficulty: "fortgeschritten",
    question: "Was verhindert Idempotency?",
    options: [
      "Doppelte Dokumente/Jobs durch Doppelklicks oder Retries",
      "Login",
      "Google Places",
      "Consent-Banner"
    ],
    correctIndices: [0],
    explanation: "Idempotency schützt vor Duplikaten."
  },
  {
    id: "dsgvo-cockpit",
    category: "privacy",
    difficulty: "basis",
    question: "Wofür ist das DSGVO-Cockpit?",
    options: [
      "Datenschutzrelevante Prozesse, Auskünfte, Löschung und Nachweise bündeln",
      "Kunden bewerten",
      "Social Posts erstellen",
      "Kassenbons drucken"
    ],
    correctIndices: [0],
    explanation: "DSGVO-Cockpit unterstützt Datenschutzprozesse."
  },
  {
    id: "security-2fa",
    category: "privacy",
    difficulty: "basis",
    question: "Wofür ist Sicherheit & 2FA?",
    options: [
      "Logins schützen und Identität zusätzlich absichern",
      "Google Ranking garantieren",
      "PDFs rendern",
      "Rechnungen exportieren"
    ],
    correctIndices: [0],
    explanation: "2FA erhöht Zugriffssicherheit."
  },
  {
    id: "api-keys",
    category: "privacy",
    difficulty: "basis",
    question: "Wofür ist API-Keys-Verwaltung?",
    options: [
      "Externe Zugriffe kontrolliert verwalten und begrenzen",
      "Kunden öffentlich machen",
      "MFA deaktivieren",
      "CRM löschen"
    ],
    correctIndices: [0],
    explanation: "API-Keys brauchen Kontrolle, Rechte und Protokollierung."
  },
  {
    id: "consent",
    category: "privacy",
    difficulty: "basis",
    question: "Wann darf clientseitiges Analyse-/Fehlertracking laufen?",
    options: [
      "Nach passender Einwilligung, sofern nicht technisch notwendig begründet",
      "Immer ohne Hinweis",
      "Nur bei Premiumkunden",
      "Sobald Google Maps aktiviert ist"
    ],
    correctIndices: [0],
    explanation: "Clientseitiges Tracking ist consent-sensibel."
  },
  {
    id: "backend-sentry",
    category: "privacy",
    difficulty: "fortgeschritten",
    question: "Was ist bei Backend-Sentry wichtig?",
    options: [
      "Datenminimierung/Redaction und Nennung in der Datenschutzerklärung",
      "Alle Bodies ungefiltert senden",
      "AV-Verträge ersetzen",
      "Kunden Adminzugang geben"
    ],
    correctIndices: [0],
    explanation: "Backend-Monitoring muss datensparsam und dokumentiert sein."
  },
  {
    id: "admin-logs",
    category: "privacy",
    difficulty: "fortgeschritten",
    question: "Warum sind Admin-Protokolle wichtig?",
    options: [
      "Nachvollziehbarkeit kritischer Aktionen",
      "Öffentliche Kundenwerbung",
      "Backups ersetzen",
      "Passwörter speichern"
    ],
    correctIndices: [0],
    explanation: "Logs helfen bei Sicherheit, Support und Rechenschaft."
  },
  {
    id: "backup-restore",
    category: "privacy",
    difficulty: "basis",
    question: "Was gehört zum Backup-/Restore-Konzept?",
    options: [
      "Regelmäßige Backups, getesteter Restore, Protokolle und Aufbewahrungsfristen",
      "Screenshots statt Dumps",
      "Unbegrenzte öffentliche Backups",
      "Nur einmal jährlich"
    ],
    correctIndices: [0],
    explanation: "Backup ist nur vollständig, wenn Restore möglich und geprüft ist."
  },
  {
    id: "least-privilege",
    category: "privacy",
    difficulty: "fortgeschritten",
    question: "Was bedeutet Least Privilege?",
    options: [
      "Jeder Nutzer bekommt nur die Rechte, die er wirklich braucht",
      "Alle Nutzer bekommen Adminrechte",
      "Alle Daten werden öffentlich",
      "Nur Kunden sehen Logs"
    ],
    correctIndices: [0],
    explanation: "Minimale Rechte reduzieren Risiko."
  },
  {
    id: "avv",
    category: "privacy",
    difficulty: "basis",
    question: "Welche Unterlagen sind datenschutzrechtlich wichtig?",
    options: [
      "Datenschutzerklärung, AV-Verträge, Subunternehmerliste, Löschkonzept, VVT",
      "Nur Logo",
      "Nur Preisliste",
      "Nur Instagram-Bio"
    ],
    correctIndices: [0],
    explanation: "Technik braucht rechtliche Dokumentation."
  }
]


const PLAUSIBLE_DISTRACTORS: Record<QuizCategory, string[]> = {
  foundation: [
    "Eine interne Admin-Funktion, die nicht automatisch im Kundenportal sichtbar ist",
    "Ein freigegebenes Kundenportal-Ergebnis ohne Zugriff auf andere Kunden",
    "Eine Prozesshilfe für Akquise, Betreuung und Nachweisführung",
    "Eine Rolle mit klar begrenztem Zugriff auf passende Daten"
  ],
  crm: [
    "Eine strukturierte Kundenakte mit Status, Kontakt und Historie",
    "Eine Pipeline-Stufe für den nächsten Vertriebs- oder Betreuungsschritt",
    "Eine interne Notiz zur Nachverfolgung des Kundenverlaufs",
    "Eine Segmentierung nach Paket, Potenzial oder Risiko"
  ],
  sales: [
    "Ein Gesprächsanlass für den Erstkontakt mit lokalem Mehrwert",
    "Eine Paketempfehlung auf Basis von Bedarf, Wirkung und Aufwand",
    "Ein Angebot mit klaren Leistungen, Setup und laufender Betreuung",
    "Ein Lead-Datensatz mit Branche, Ort, Status und nächstem Schritt"
  ],
  google: [
    "Ein Google Business Profil mit Kategorien, Fotos, Beiträgen und Bewertungen",
    "Eine lokale Sichtbarkeitskennzahl für Suchanfragen im Umfeld",
    "Eine Optimierungsmaßnahme für Profilqualität und lokale Auffindbarkeit",
    "Ein Wettbewerbsvergleich mit ähnlichen Betrieben in derselben Region"
  ],
  reviews: [
    "Ein Bewertungsprozess mit öffentlichem Review und internem Feedbackkanal",
    "Eine Antwortvorlage für sachliche, markenkonforme Kundenkommunikation",
    "Eine Sentiment-Auswertung aus wiederkehrenden Themen in Bewertungen",
    "Ein QR-gestützter Bewertungsfluss mit sauberer Weiterleitung"
  ],
  automation: [
    "Ein Workflow mit Auslöser, Bedingung und Aktion",
    "Eine automatische Erinnerung für wiederkehrende Kundenaufgaben",
    "Eine Regel, die nach Status oder Paket unterschiedlich reagiert",
    "Eine interne Automation zur Entlastung im Kundenbetrieb"
  ],
  content: [
    "Ein vorbereiteter Beitrag für Google, Instagram oder Newsletter",
    "Eine Textvorlage, die an Kunde, Anlass und Kanal angepasst wird",
    "Eine Freigabe-Schleife für Inhalte vor Veröffentlichung",
    "Ein Content-Plan für wiederkehrende lokale Sichtbarkeit"
  ],
  loyalty: [
    "Eine QR-Kampagne mit Slug-Seite und klarer Kundenaktion",
    "Ein Rewards-System mit Punkten, Regeln und Einlösung",
    "Eine Scan-Regel gegen Mehrfachnutzung und Missbrauch",
    "Ein Kundenbindungsbaustein für wiederkehrende Besuche"
  ],
  reports: [
    "Ein Monatsreport mit KPI, Maßnahmen und nächster Empfehlung",
    "Ein exportierbares PDF für Kundennachweis und Beratung",
    "Eine Freigabeansicht für kundenspezifische Dokumente",
    "Eine Zusammenfassung von SEO, Reviews, QR und Fortschritt"
  ],
  finance: [
    "Eine Rechnung mit Leistung, Status, Betrag und PDF",
    "Ein Buchhaltungs-Export für interne Weiterverarbeitung",
    "Eine Paketgebühr mit Einrichtungskosten und laufendem Preis",
    "Eine Zahlungs- oder Mahnstufe zur Nachverfolgung offener Beträge"
  ],
  operations: [
    "Ein Health-Check für System, Datenqualität und Betriebsbereitschaft",
    "Eine Backup- oder Monitoring-Prüfung für den laufenden Betrieb",
    "Eine Qualitätskontrolle für fehlende Daten und Dubletten",
    "Ein internes Protokoll für Änderungen und Admin-Aktionen"
  ],
  privacy: [
    "Eine Zugriffstrennung zwischen Admin, Kunde und internem Backoffice",
    "Eine DSGVO-konforme Begrenzung auf notwendige Daten",
    "Eine sichere Freigabe nur für den passenden Kundenkontext",
    "Ein Audit- oder Log-Nachweis für sensible Vorgänge"
  ]
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function uniqueText(items: string[]) {
  const seen = new Set<string>()
  return items
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

function normalizeQuizQuestion(q: QuizQuestion, pool: QuizQuestion[]): QuizQuestion {
  const correctTexts = uniqueText(q.correctIndices.map((index) => q.options[index]).filter(Boolean))
  const currentWrong = q.options.filter((_, index) => !q.correctIndices.includes(index))

  const poolWrong = pool
    .filter((item) => item.category === q.category && item.id !== q.id)
    .flatMap((item) => item.options.filter((_, index) => !item.correctIndices.includes(index)))

  const categoryWrong = PLAUSIBLE_DISTRACTORS[q.category] || []
  const wrongTexts = uniqueText([...currentWrong, ...categoryWrong, ...poolWrong])
    .filter((option) => !correctTexts.includes(option))

  const desiredCount = Math.min(Math.max(4, correctTexts.length + 3), correctTexts.length + wrongTexts.length)
  const selectedWrong = shuffleArray(wrongTexts).slice(0, Math.max(0, desiredCount - correctTexts.length))
  const mixed = shuffleArray([
    ...correctTexts.map((text) => ({ text, correct: true })),
    ...selectedWrong.map((text) => ({ text, correct: false }))
  ])

  return {
    ...q,
    options: mixed.map((item) => item.text),
    correctIndices: mixed.map((item, index) => item.correct ? index : -1).filter((index) => index >= 0),
    answerMeta: {
      shuffled: true,
      distractors: 'category_plausible'
    }
  }
}

export function buildQuestionSet(count = 30, categories?: QuizCategory[]) {
  const filtered = categories?.length
    ? ADMIN_KNOWLEDGE_QUESTIONS.filter((q) => categories.includes(q.category))
    : ADMIN_KNOWLEDGE_QUESTIONS

  const shuffled = shuffleArray(filtered)
  return shuffled
    .slice(0, Math.min(count, shuffled.length))
    .map((question) => normalizeQuizQuestion(question, filtered))
}

export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, number[]>) {
  let correct = 0
  const byCategory: Record<string, { correct: number; total: number }> = {}

  for (const q of questions) {
    const given = [...(answers[q.id] || [])].sort((a, b) => a - b)
    const expected = [...q.correctIndices].sort((a, b) => a - b)
    const isCorrect = given.length === expected.length && given.every((v, i) => v === expected[i])
    if (!byCategory[q.category]) byCategory[q.category] = { correct: 0, total: 0 }
    byCategory[q.category].total += 1
    if (isCorrect) {
      correct += 1
      byCategory[q.category].correct += 1
    }
  }

  return {
    correct,
    total: questions.length,
    percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    passed: questions.length ? correct / questions.length >= 0.8 : false,
    byCategory
  }
}
