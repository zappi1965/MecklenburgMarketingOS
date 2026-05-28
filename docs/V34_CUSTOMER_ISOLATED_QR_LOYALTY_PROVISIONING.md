# MMOS V34 Customer-Isolated QR/Loyalty Provisioning Fullbuild

## Was jetzt neu ist

Jeder neu angelegte Kunde kann individuell getestet werden:

- eigene QR-Kampagnen
- eigener `/l/[slug]` Link
- eigenes Loyalty-Programm
- eigene Landingpage
- eigener Standard-Mitarbeitercode
- eigene Leads
- eigene Pipeline Leads
- eigene Timeline Events
- eigene Modul-Daten über `v33_functional_records`

## Neue Endpunkte

```text
POST /api/v33-functional/customers/:customer_id/provision
GET  /api/v33-functional/customers/:customer_id/bootstrap
POST /api/v33-functional/customers/:customer_id/qr-campaigns
GET  /api/v33-functional/customers/:customer_id/qr-campaigns
```

## Ablauf für einen neuen Kunden

1. Kunde anlegen oder auswählen.
2. Im Dashboard `Kunden für QR/Loyalty vorbereiten` klicken.
3. Backend erzeugt automatisch:
   - QR-Kampagne
   - Slug
   - `/l/[slug]`
   - Loyalty-Programm
   - Landingpage Record
   - Standard-Thekencode
4. QR-Link kann gescannt werden.
5. Endkundendaten landen beim richtigen `customer_id`.
6. Nächster Zugriff: Daten werden aus Supabase geladen.

## QR Kampagne direkt erstellen

Im QR Tool gibt es zusätzlich:

```text
QR + Loyalty Backend erstellen
```

Das erzeugt direkt eine echte Kampagne plus Loyalty-Programm für den ausgewählten Kunden.

## Wichtige SQL

Bitte ausführen:

```text
supabase/migrations/0041_v34_customer_isolated_qr_loyalty_provisioning.sql
```

Falls 0040 noch nicht lief, 0041 ist defensiv und enthält die wichtigsten Absicherungen ebenfalls.

## Env

Vercel braucht:

```text
NEXT_PUBLIC_BACKEND_URL=https://DEIN-RAILWAY-BACKEND
```
