# Slug Reward Deleted/Scope Fix

Behoben:

- Die Slug-Seite zeigt nicht mehr alle historischen Rewards aus alten `v33_functional_records`-Snapshots.
- Maßgeblich ist jetzt die aktuelle Tabelle `loyalty_rewards`.
- Alte v33-Reward-Snapshots werden nur noch als Legacy-Fallback genutzt, wenn `loyalty_rewards` nicht lesbar ist.
- Gelöschte / archivierte / deaktivierte Rewards werden gefiltert.
- Rewards, die an eine gelöschte oder deaktivierte QR-Kampagne gebunden sind, werden nicht mehr angezeigt.
- Allgemeine aktive Customer-Rewards ohne Kampagnenbindung bleiben sichtbar.
- Kampagnengebundene aktive Rewards werden weiterhin priorisiert.
- Reward-Einlösung (`findPublicReward`) nutzt dieselbe Logik, sodass gelöschte Rewards nicht mehr eingelöst werden können.

Keine neue Supabase-Migration nötig.
