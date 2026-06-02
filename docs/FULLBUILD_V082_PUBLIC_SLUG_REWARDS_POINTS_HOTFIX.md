# V082 Public Slug Rewards & Points Hotfix

Fixes:
- Public `/l/[slug]` Punkte-Sammeln bricht nicht mehr wegen fehlender optionaler Loyalty-Spalten ab.
- Nichtkritische Folgeprozesse nach Punktevergabe blockieren den Erfolg nicht mehr.
- Reward-Titel werden über mehrere Namensfelder normalisiert.
- Gelöschte/alte Reward-Snapshots werden auf der Slug-Seite ausgeblendet.
- Reward-Löschen im Admin löscht jetzt Store-Tabelle und v33-Record.

Migration:
- `supabase/migrations/0109_v082_public_slug_rewards_points_hotfix.sql`
