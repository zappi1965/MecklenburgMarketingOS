# V42.13 – Restore V18 Customer Tools, SEO Integrations & Landing Texts

## Implementiert

- Integrationen wieder als Kundentool eingebunden und in Growth/Premium einsortiert.
- Media Center wieder als Kundentool eingebunden und ab Starter unter Betrieb sichtbar gemacht.
- SEO Dashboard in Growth und Premium eingebunden; SEO Analytics und SEO Heatmap sind dort verknüpft.
- Workflow Center wieder im Kundenbereich unter Marketing & Automation eingebunden.
- KPI Analytics wieder in Growth und Premium eingebunden.
- Adminbereich kann Integrationen, SEO Dashboard, SEO Heatmap und KPI Analytics für den gewählten Kunden öffnen.
- Integrationen UI erweitert: Google Business Profile, Search Console, Analytics und Meta; Site URL und GA4 Property ID; OAuth-Start und Sync-Aktion.
- Bestehende Backend-Google-Routes unter `/api/google` wieder registriert.
- SEO Dashboard zeigt verbundene Integrationen, Analytics-Kennzahlen und Heatmap-Bereich gemeinsam an.
- Adminbereich: Öffentliche `/l/[slug]` Landingpage-Texte können je QR/Slug-Seite bearbeitet werden.
- Öffentliche Slug-Seite liest editierbare Texte aus `qr_campaigns.metadata`.

## Hinweise

- Google OAuth und echte API-Syncs benötigen Railway-ENVs wie `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` sowie je nach Sync `GOOGLE_ANALYTICS_PROPERTY_ID` oder Search-Console-Site-URL.
- Meta Business Suite ist als Integration vorbereitet, aber noch nicht mit echter Meta API Sync-Logik verbunden.
- Landingpage-Texte werden bewusst in `qr_campaigns.metadata` gespeichert, damit keine neue Datenbanktabelle erforderlich ist.
