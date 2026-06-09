# Slug Reviews & Rewards Visibility Fix

Behoben:

- Reviews auf `/l/[slug]` werden serverseitig anhand des Slugs automatisch dem richtigen
  `customer_id`, `loyalty_program_id` und `qr_campaign_id` zugeordnet.
- `review_feedback` enthält dadurch zuverlässig den Kampagnenbezug.
- Die QR-Kampagne erhält im `metadata`-Feld Review-Zähler, letzte Review-ID, letzte Sternebewertung und Zeitstempel.
- Rewards werden im Public-Status nicht mehr ausgeblendet, nur weil sie keiner bestimmten Kampagne zugeordnet sind.
- Kampagnengebundene Rewards erscheinen zuerst, allgemeine Customer-Rewards bleiben trotzdem sichtbar.
- Auf der Slug-Seite ist „Rewards anzeigen“ jetzt jederzeit sichtbar.
- Reward-Übersicht ist standardmäßig geöffnet, damit Kunden Rewards sofort sehen.
- Nach Review-Abgabe wird die UI direkt aktualisiert und bestätigt, dass die Bewertung gespeichert wurde.

Keine neue Supabase-Migration nötig.
