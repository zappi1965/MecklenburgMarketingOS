# V42.18 Akquise-Kampagnen-Center

## Neu
- Adminbereich → Akquise & Sales → Akquise-Kampagnen
- Verknüpft Leads, Google Business Audit, Mini-Audit, Angebot, Vertrag und Pipeline.
- Neue optionale Supabase-Tabelle: `acquisition_campaigns`.
- Zusatzspalten für Lead/Audit/Offer/Contract-Verknüpfungen in `SQL_V42_18_AKQUISE_KAMPAGNEN_CENTER.sql`.

## Workflow
Lead Scraper → Kampagne → Audit + Mini-Audit → Angebot → Vertrag → Pipeline/Follow-up.

## Live-Betrieb
Für persistente Speicherung bitte `SQL_V42_18_AKQUISE_KAMPAGNEN_CENTER.sql` in Supabase ausführen.
