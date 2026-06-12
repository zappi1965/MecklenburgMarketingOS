-- MMOS V098: Referral-Skalierung
-- Beseitigt den Full-Table-Scan in resolveReferrer: der persönliche Referral-Code
-- (letzte 8 alphanumerische Zeichen des member_token, uppercase) wird denormalisiert
-- an loyalty_customers gespeichert und indexiert. Idempotent.

alter table if exists public.loyalty_customers
  add column if not exists referral_code text;

-- Schneller, kundengescopter Lookup per Code.
create index if not exists idx_loyalty_customers_referral_code
  on public.loyalty_customers(customer_id, referral_code);

-- Backfill bestehender Mitglieder (passt zur JS-Ableitung referralCodeForMember).
update public.loyalty_customers
   set referral_code = upper(right(regexp_replace(coalesce(member_token, ''), '[^a-zA-Z0-9]', '', 'g'), 8))
 where referral_code is null
   and member_token is not null
   and length(regexp_replace(coalesce(member_token, ''), '[^a-zA-Z0-9]', '', 'g')) >= 6;
