# MMOS Tool Readiness & Backoffice Completion Pack

## Umgesetzt

Dieses Paket setzt die schriftlich genannten offenen Punkte soweit technisch möglich um, ohne externe Live-Handlungen zu behaupten.

### Neu

- `/admin/production/tool-readiness`
- `GET /api/production/tool-readiness/overview`
- `GET /api/production/tool-readiness/export.md`

### Kundenportal Backoffice V1 ergänzt

- `/portal/dashboard`
- `/portal/qr-campaigns`
- `/portal/loyalty`
- `/portal/reviews`
- `/portal/campaigns`
- `/portal/settings`
- `/portal/team`
- `/portal/billing`

Diese Seiten sind bewusst V1/read-only/portalartig, damit der Kunde einen sauberen Bereich hat, ohne riskanten Self-Service zu aktivieren.

### Tool-Reife 1–100

Der neue Bereich bewertet alle verkaufbaren Tools von 1–100, zeigt:

- Basis-Score
- Live-Score
- fehlende Punkte
- Systemchecks
- externe Live-Nachweise
- stärkste/schwächste Tools
- Markdown-Export

### Dokumente ergänzt

- `docs/production/TOOL_PRODUCTION_READINESS_RUNBOOK.md`
- `docs/contracts/LEISTUNGSBESCHREIBUNG_NEUE_TOOLS.md`
- `docs/contracts/ADDON_PREISLISTE_NEUE_TOOLS.md`
- `docs/legal/SUMUP_ABGRENZUNG_KASSE.md`

## Nicht automatisch durch Code möglich

- Resend DNS live setzen
- Gotenberg live betreiben
- SumUp OAuth/Token live verbinden
- anwaltliche Prüfung
- echte Supabase-Migration in deinem Live-Projekt
- echter Smartphone-Test
- echter Pilotkunde

Diese Punkte sind jetzt aber als Checks/Live-Proofs sichtbar.
