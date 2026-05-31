# QR Duplicate / Idempotent Save Fix

Behoben:

- Der QR wurde zuerst über `v33FunctionalClient.createQrCampaign` korrekt im Backend gespeichert.
- Danach hat das Frontend denselben QR mit derselben `id` erneut über `/api/store/qr_campaigns` gespeichert.
- Das führte zu:
  - `duplicate key value violates unique constraint "qr_campaigns_pkey" [23505]`
  - irreführender Meldung "nicht authentifiziert", obwohl die Speicherung bereits erfolgreich war.

Neu:

- Nach erfolgreicher v33-Backend-Erstellung wird der QR nur noch lokal in die UI hydratisiert.
- Kein zweiter Insert über `/api/store/qr_campaigns`.
- `/api/store` ist für doppelte Inserts mit gleicher `id` idempotent und gibt den bestehenden Datensatz zurück.
- Frontend unterscheidet jetzt Auth-Fehler von Duplicate-Key-Fehlern.
- Duplicate-Key-Fehler werden nicht mehr als Auth-Fehler angezeigt.

Keine neue Supabase-Migration nötig.
