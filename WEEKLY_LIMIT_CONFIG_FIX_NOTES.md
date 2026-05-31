# Weekly Limit Config Fix

Behoben:

- Es gab ein verstecktes Default-Wochenlimit von 5 Einlösungen (`weekly_scan_limit: 5`).
- Dadurch wurde nach 5 Einlösungen blockiert, obwohl Tageslimit und Punkte-Tageslimit höher gesetzt waren.
- Das Default-Wochenlimit ist jetzt `0` und deaktiviert.
- Wochenlimit für Einlösungen greift nur noch, wenn `weekly_scan_limit_enabled=true` gesetzt ist.
- In der UI ist das Wochenlimit jetzt explizit per Checkbox aktivierbar.
- Zusätzlich gibt es jetzt ein Punkte-Wochenlimit `weekly_point_limit_per_member`.
- Das Punkte-Wochenlimit wird migrationsfrei über `metadata.weekly_point_limit_per_member` gespeichert.
- Bei 0 ist das Punkte-Wochenlimit unbegrenzt.
- Fehlermeldungen unterscheiden jetzt Einlöse-Wochenlimit und Punkte-Wochenlimit.

Keine neue Supabase-Migration nötig.
