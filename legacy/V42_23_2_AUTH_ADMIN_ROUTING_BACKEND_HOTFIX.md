# V42.23.2 Auth Admin Routing Backend Hotfix

This hotfix moves the role/profile lookup for /auth to the Railway backend route `/api/auth/me`, which uses the Supabase Service Role key. This prevents frontend RLS from hiding `public.user_profiles` and falsely treating an active admin as an unapproved customer.

Deploy required:
- Frontend: Vercel
- Backend: Railway
- Supabase SQL: not required
