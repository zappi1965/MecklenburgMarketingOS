# FULLBUILD V077 — Starter: zugewiesene QR-Kampagnen statt Selbstanlage

## Ziel
Starter-Kunden sollen im Kundenportal keine eigenen QR-Kampagnen starten können. QR-Kampagnen im Starter-Paket werden durch den Admin erstellt und dem Kunden zugewiesen.

## Umsetzung
- Im Starter-Kundenportal wird der Button „QR Kampagne erstellen“ ausgeblendet.
- Das Formular zum Erstellen neuer QR-Kampagnen wird für Starter-Kunden ausgeblendet.
- Starter-Kunden sehen nur die ihnen zugewiesenen QR-Kampagnen.
- Starter-Kunden können die Zielseite öffnen, den Link kopieren und in den Bereich „QR Zielseite“ wechseln.
- Aktivieren/Deaktivieren und Löschen bleiben für Starter-Kunden gesperrt.
- Admins können weiterhin QR-Kampagnen für Starter-Kunden erstellen und verwalten.
- Growth/Premium bleiben unverändert: dort können QR-Kampagnen im Kundenbereich weiter genutzt und erweitert werden.

## Supabase
Keine neue Migration erforderlich.
