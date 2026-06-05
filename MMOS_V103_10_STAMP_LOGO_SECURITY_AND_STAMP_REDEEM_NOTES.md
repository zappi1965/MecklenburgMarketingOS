# MMOS V103.10 — Stamp-Logo Security & Stamp Redeem Stability

Umgesetzt:

1. Eigener Upload-Endpunkt für Stempel-Logos
   - `POST /api/v33-functional/qr-campaigns/:id/stamp-logo`
   - ersetzt den vorherigen Umweg über `/api/avatars/upload`.

2. Serverseitige Upload-Härtung
   - nur PNG, JPG/JPEG und WEBP
   - Standardlimit: 3 MB (`MMOS_STAMP_LOGO_MAX_BYTES` optional)
   - MIME-Type + Magic-Bytes-Prüfung
   - strukturierte Fehler für zu große/ungültige Dateien

3. Kampagnen-/Kundenbindung
   - Upload prüft die konkrete `qr_campaigns.id`
   - Admin darf immer
   - Kunden dürfen nur Kampagnen ihres eigenen `customer_id` bearbeiten
   - Logo wird in `stamp-logos/{customer_id}/{qr_campaign_id}/...` gespeichert
   - `qr_campaigns.metadata.stamp_card_logo_url` wird automatisch gesetzt

4. Stempel-Reset Variante A
   - Prämieneinlösung zieht weiterhin Punkte ab
   - Da Stempel aus `points_balance / points_per_stamp` berechnet werden, verschwinden die entsprechenden Stempel automatisch mit dem Punkteabzug
   - Response/Metadaten enthalten `stamps_spent` und `points_per_stamp`

5. QR-Kampagnen-Owner-Check
   - `final-slug-settings` prüft jetzt ebenfalls, ob der Nutzer die konkrete Kampagne bearbeiten darf
   - externe Stempel-Logo-URLs sind für Kunden blockiert; Upload oder interne MMOS-/Supabase-URL nutzen

6. Public-Slug Logo-Fallback
   - Wenn ein Stempel-Logo nicht lädt, fällt die Stempelkarte automatisch auf Haken/Stern zurück

Neue Migration:
- `supabase/migrations/0103_10_stamp_logo_security_and_storage.sql`

Wichtig nach Deploy:
- Migration in Supabase ausführen
- Railway Backend neu deployen
- Danach Frontend neu deployen
