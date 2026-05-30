# Clean Neu & Wichtig Menu Fix

Gefixt wurde, dass in der AdminShell unter bzw. direkt nach `Neu & wichtig` auch Roadmap-/Fremdpunkte wie `E-Rechnung` sichtbar waren.

## Ursache

Es gab zwei Navigationssysteme:

1. die bestehende Haupt-App / Legacy-Sidebar
2. die neue AdminShell-Sidebar unter `/admin/...`

Die Legacy-Sidebar war bereits auf die richtigen Punkte korrigiert.
Die AdminShell enthielt aber noch eine große Roadmap-Navigation mit Punkten wie `E-Rechnung`, `Smart Pricing`, `Kassen-Anbindung` usw. Dadurch sah es so aus, als würden diese Punkte zu `Neu & wichtig` gehören.

## Fix

Die AdminShell-Sidebar wurde auf eine saubere, kurze Struktur reduziert:

### Neu & wichtig

- Tool-Zentrale
- Wissenstest
- Mini Audit Generator
- Lead Engine
- Production Readiness
- Security Core

### Bestehendes MMOS

- Zurück zum Dashboard
- Kunden / CRM
- Reports & Media

`E-Rechnung` und andere nicht zugehörige Roadmap-Punkte wurden aus dieser Sidebar entfernt.
