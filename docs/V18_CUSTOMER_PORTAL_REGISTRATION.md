# MMOS v18 Customer Portal Registration Fullbuild

## Umgesetzt

### Landingpage
- Button `Anmelden` führt zu `/auth`
- daneben nur noch ein Button `Demo`
- `Demo Admin` und `Demo Kunde` wurden auf einen einfachen Demo-Einstieg reduziert

### Auth-Seite
`/auth` enthält jetzt:
- Login
- Registrierung
- Passwort vergessen

### Kundenregistrierung
Kunde kann angeben:
- Firma
- Ansprechpartner
- E-Mail
- Telefon
- gewünschtes Paket: Starter / Growth / Premium

Nach Registrierung:
- Kunde wird als `pending` angelegt
- Eintrag in `customer_registrations`
- Paketanfrage wird vorbereitet
- Notification wird vorbereitet

### Admin-Freigabe-Grundlage
Neue Backend-Endpunkte:
- `GET /api/customer-portal/registrations`
- `POST /api/customer-portal/approve/:id`
- `POST /api/customer-portal/package-request`

### Supabase
Neue Tabelle:
- `customer_registrations`

Erweiterte Tabellen:
- `customers`
- `package_requests`

## Deploy

1. Supabase SQL ausführen:
`0027_v18_customer_portal_registration.sql`

2. Railway Backend redeployen:
Root Directory: `backend`
Start Command: `npm start`

3. Vercel Frontend redeployen.

4. In Vercel müssen gesetzt sein:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`

## Wichtig

Supabase Auth muss Email Login aktiviert haben:
Authentication → Providers → Email aktivieren.

Bei aktiver E-Mail-Bestätigung muss der Kunde ggf. erst seine Mail bestätigen.
