# V42.24.6 – Live-Kunden-anlegen Button Hotfix

## Ziel
Der Button **„Live-Kunden anlegen“** im Hinweispanel „Kein Live-Kunde ausgewählt“ soll nicht nur zur CRM-Ansicht wechseln, sondern direkt ein Eingabefeld/Formular zum Anlegen eines echten Kunden öffnen.

## Änderung
- `frontend/src/app/page.tsx`
  - `NoLiveCustomerPanel` erweitert.
  - Button **„Live-Kunden anlegen“** öffnet jetzt ein Inline-Formular.
  - Formularfelder:
    - Firmen-/Kundenname
    - Branche
    - E-Mail
    - Telefonnummer
    - Hauptansprechpartner
    - Adresse
    - Paket: Starter/Growth/Premium
    - Status: Aktiv/In Vorbereitung/Lead
  - Beim Speichern wird ein Datensatz in `customers` erstellt.
  - Der Kunde wird ausdrücklich mit `is_demo=false` gespeichert.
  - Nach erfolgreichem Speichern wird der neue Kunde automatisch als aktiver Kunde gesetzt und das CRM geöffnet.

## Live-/Demo-Trennung
Die bestehende Trennung bleibt erhalten:
- Live-Neuanlage: `is_demo=false`
- Demo-Modus: weiterhin separat über Testumgebung/Demo-Daten
- Keine Demo-Daten werden gelöscht.

## Deployment
Für diesen Hotfix reicht im Frontend minimal:

```txt
frontend/src/app/page.tsx
```

Optional zusätzlich:

```txt
V42_24_6_LIVE_CUSTOMER_CREATE_BUTTON.md
```
