# V42.23.8 Reward Redemption Staff Code Enforcement

## Scope

This build adds the public end-customer reward redemption flow:

1. End customer logs into `/l/[slug]` with email and password.
2. Unlocked rewards are shown based on current points.
3. Customer clicks `Prämie einlösen`.
4. Staff code / PIN is required by default.
5. Backend validates the staff code against the selected customer/campaign.
6. Points are deducted.
7. Redemption is stored in `loyalty_reward_redemptions` with fallback to `v33_functional_records`.
8. The same reward can be configured as once-only or multiple-use.

## Config fields per reward

- `staff_code_required`: defaults to true.
- `allow_multiple_redemptions`: false = only once per loyalty account, true = can be used multiple times.
- `max_redemptions_per_member`: optional limit; use `0` for unlimited when multiple-use is enabled.

## Deployment

- Frontend: redeploy Vercel.
- Backend: redeploy Railway.
- Supabase: run `SQL_V42_23_8_REWARD_REDEMPTION_STAFF_CODE.sql`.
