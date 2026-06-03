# MMOS V084 – Public Points + Rewards Hardening

Fixes for public QR slug pages:

- Public points saving is more tolerant of live schema differences.
- `loyalty_customers` insert/update now retries after removing optional fields missing from PostgREST schema cache.
- `loyalty_transactions` insert now retries after removing optional fields such as `description`, `source`, `metadata`, `qr_campaign_id`.
- Reward display now prefers active `v33_functional_records` because Admin edits/deletes are reflected there first.
- Inactive/deleted reward records suppress corresponding table rows.
- Reward titles are normalized from `title`, `name`, `label`, `reward_title`, `reward_name`, `description`, or metadata.

Migration:

- `supabase/migrations/0111_v084_public_points_rewards_hardening.sql`

Run after deployment.
