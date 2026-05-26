
# MMOS v18 Storage CRM Flow Fix Build

Basis: V18 Storage Upload E2E Extension Build.

Umgesetzt:
- Paketanfragen im Admin Dashboard öffnen CRM Detail.
- Paketfreischaltung ohne Duplicate-Key-Fehler.
- Beim Paketwechsel werden alte Tools deaktiviert und Paket-Tools aktiviert.
- Notizen zeigen Ersteller und Datum.
- CRM Rechnungsfenster ist scrollbar und zeigt aktuelle Rechnungen + hochgeladene Rechnungs-PDFs.
- Upload-Typ auswählbar: Rechnung, Vertrag, Media, Dokument, Report.
- Dateien werden im passenden CRM-Bereich angezeigt.
- Dateien können gelöscht werden.
- Dateikarten zeigen Name, Typ, Größe, Ersteller, Datum und Mini-Preview.
- Rechnungsnamen nach Format `Re_Kundenname_mit_Unterstrichen_NummerProKunde`.
- Rechnungsvorlage Upload inkl. Platzhalter-Anleitung.
- Ticketantwort schließt Ticket automatisch.
- Geschlossene Tickets wandern ins Archiv.
- Booking mit Text, Tagesdetail und Termin-Detail.
- Pipeline, Automationen, Workflows, Aktivitäten wiederhergestellt.
- Demo Kunden öffnen direkt Kundenumgebung.
- Demo Pakete: Alexas Starter, Barber Growth, NordDach Premium.
- Kunden Dashboard: SEO Growth 7 Tage + offene Tickets.
- Kunden Booking mit Kundenanlage und Kundensuche.
- Integrationen wiederhergestellt.
- Kundenpakete: aktiv / angefragt / kündigen.

Deploy:
1. Supabase Patch ausführen:
   `supabase/migrations/0012_v18_storage_crm_flow_fix_patch.sql`
2. Railway Backend aus dieser ZIP redeployen.
3. Vercel Frontend aus dieser ZIP redeployen.
4. ENV prüfen:
   Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE`
