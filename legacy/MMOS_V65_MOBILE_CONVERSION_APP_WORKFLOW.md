# MMOS v0.65 — Mobile Conversion + App Workflow

Dieser Fullbuild baut auf v0.64 auf und fokussiert das mobile App-Gefühl sowie die mobile Verkaufs- und Arbeitsführung.

## Umgesetzt

- Sticky Mobile-CTA auf der öffentlichen Landingpage.
- Paketkarten mobil als Swipe-/Snap-Cards optimiert.
- Paketanfrage-Formular mobil als Bottom-Sheet mit Drag-Handle-Optik.
- Mobiler Kunden-Startbereich „Meine Ergebnisse“ mit Swipe-Kennzahlen.
- Mobiler Admin-Arbeitsmodus „Heute wichtig“ als App-Kommandozentrale.
- Floating Action Button im Admin- und Kundenbereich.
- Kompaktere App-Header, stärkere Safe-Area-Unterstützung und bessere Touch-Ziele.
- Verbesserte mobile Karten, Tabellen, Formulare, Modale und Statusflächen.
- Keine Backend-, Worker- oder Supabase-Logik entfernt.

## Deployment

Nur Frontend/Vercel deployen.

Backend, Worker und Supabase müssen für diesen Mobile-UI-Fix nicht neu deployed werden.
