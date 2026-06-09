# MMOS V093 – Rückholmail-Editor pro Kunde/Betrieb

## Inhalt

V093 erweitert das zubuchbare Rückholtool um einen vollständigen Mail-Editor im Kundendashboard.

## Neu

- Rückholmail-Betreff pro Kunde/QR-Zielseite anpassbar
- Rückholmail-Text pro Kunde/QR-Zielseite anpassbar
- Button-Text anpassbar
- Signatur anpassbar
- Reminder-Betreff anpassbar
- Reminder-Mailtext anpassbar
- Reminder-Button anpassbar
- Platzhalter-System
- Live-Vorschau im Dashboard
- Testmail nutzt die angepassten Texte
- echte Rückholmails und Reminder nutzen die gespeicherten Vorlagen
- Pflichtfooter bleibt unveränderbar
- Double-Opt-in-Hinweis und Abmeldelink bleiben systemseitig fest

## Platzhalter

- `{vorname}`
- `{name}`
- `{betrieb}`
- `{praemie}`
- `{punkte}`
- `{punkte_text}`
- `{gueltig_bis}`
- `{rueckhol_link}`
- `{einloese_hinweis}`

## Migration

```sql
supabase/migrations/0118_v093_reactivation_customer_mail_templates.sql
```

## Wichtig

Der Mailtext ist editierbar, aber der rechtlich relevante Pflichtbereich bleibt nicht editierbar:

- Double-Opt-in-Hinweis
- Abmeldelink / Widerruf
- Systemhinweis zur Einwilligungsgrundlage

## Testablauf

1. V093 deployen
2. Migration 0118 ausführen
3. Rückholaktionen beim Kunden freischalten
4. QR Kampagnen → QR Zielseite → Rückholaktionen öffnen
5. E-Mail-Vorlage bearbeiten
6. Vorschau prüfen
7. Testmail senden
8. persönliche Links erzeugen
9. E-Mails senden
10. Link öffnen und mit Mitarbeitercode einlösen
