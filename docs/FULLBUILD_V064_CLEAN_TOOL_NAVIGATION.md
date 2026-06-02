# MMOS V064 – Clean Tool Navigation

Stand: 02.06.2026

## Ziel

Backoffice ist keine zweite UI mehr. Interne Tools werden nach Zweck in die bestehende Hauptnavigation einsortiert.

## Kategorien

- Kunden & Betrieb
- Akquise, Audits & Abschluss
- Sichtbarkeit & Reputation
- QR, Loyalty & Automation
- Finanzen & Pakete
- System, Sicherheit & Verwaltung

## Audit-Zusammenführung

Audit-nahe Tools liegen gesammelt in **Akquise, Audits & Abschluss**:

- Verkaufsworkflow
- Lead Scraper
- Akquise-Kampagnen
- Google Business Audit
- Mini-Audit Generator
- Angebotsgenerator
- Vertragsgenerator
- Pipeline

## Dedupe

Die Navigation nutzt `usedNavTools`, damit ein Tool nicht doppelt in mehreren Kategorien erscheint.

## Redirects

- `/admin` → `/?app=1&view=dashboard`
- `/portal/backoffice` → `/?app=1&view=dashboard`

## Prüfen

```bash
yarn quality:guard
yarn --cwd frontend typecheck
yarn --cwd frontend build
```
