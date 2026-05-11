
# Frontend mit Supabase verbinden

## 1. Paket installieren

Im Ordner `frontend`:

```bash
yarn add @supabase/supabase-js
```

oder

```bash
npm install @supabase/supabase-js
```

## 2. Datei anlegen

Lege im Frontend an:

```txt
frontend/lib/supabaseClient.js
```

Inhalt aus `supabaseClient.js` einfügen.

## 3. Vercel Environment Variables setzen

In Vercel → Project → Settings → Environment Variables:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Danach Redeploy.

## 4. Login ersetzen

Aktuell prüft dein Build das Passwort nur optisch. Für echte Supabase Auth nutzt du:

```js
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

## 5. Aktuellen User + Rolle laden

```js
const { data: { user } } = await supabase.auth.getUser()

const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
```

Wenn `profile.role === 'admin'`, Adminbereich anzeigen.
Wenn `profile.role === 'customer'`, nur Kundentools anzeigen.

## 6. Kundendaten laden

Admin:

```js
const { data: customers } = await supabase
  .from('customers')
  .select('*')
```

Kunde:

```js
const { data: access } = await supabase
  .from('user_customer_access')
  .select('customer_id, customers(*)')
  .eq('user_id', user.id)
```

## 7. Beispiele für die wichtigsten Schreibvorgänge

### Ticket erstellen

```js
await supabase.from('tickets').insert({
  customer_id,
  title,
  description,
  status: 'angekommen',
  created_by: user.id
})
```

### Ticketstatus als Admin ändern

```js
await supabase
  .from('tickets')
  .update({ status: 'in Bearbeitung' })
  .eq('id', ticketId)
```

### Admin Feedback zum Ticket

```js
await supabase.from('ticket_messages').insert({
  ticket_id,
  author_id: user.id,
  message: feedback,
  is_admin_feedback: true
})
```

### Rechnung erstellen

```js
await supabase.from('invoices').insert({
  invoice_number: 'RE-' + Date.now(),
  customer_id,
  amount,
  invoice_date: new Date().toISOString().slice(0,10),
  due_date,
  status: 'Offen',
  service
})
```

### SaaS Abo + Rechnung

```js
const { data: invoice } = await supabase
  .from('invoices')
  .insert({
    invoice_number: 'RE-' + Date.now(),
    customer_id,
    amount: monthly_price,
    status: 'Offen',
    service: plan_name
  })
  .select()
  .single()

await supabase.from('subscriptions').insert({
  customer_id,
  plan_name,
  monthly_price,
  created_invoice_id: invoice.id
})
```

### Integration speichern

```js
await supabase.from('integrations').upsert({
  customer_id,
  platform,
  api_key
}, { onConflict: 'customer_id,platform' })
```

### Email Vorlage speichern

```js
await supabase.from('email_templates').insert({
  category_id,
  name,
  body,
  created_by: user.id
})
```

## 8. Wichtige Tabellen-Zuordnung

- CRM Kundenliste → `customers`
- CRM Kontakte → `customer_contacts`
- CRM Notizen → `customer_notes`
- Dateien → `customer_files`
- SEO Dashboard → `seo_snapshots`, `seo_keywords`, `seo_checks`
- Review Dashboard → `reviews`
- Reputation Shield → `reputation_alerts`
- Booking → `appointments`, `service_categories`
- Lead Gespräche → `lead_meetings`
- Rechnungen → `invoices`, `reminders`, `subscriptions`
- Lead Scraper → `lead_searches`, `lead_contacts`
- QR Kampagnen → `qr_campaigns`
- Email Center → `email_template_categories`, `email_templates`
- Reporting → `reports`
- Tickets → `tickets`, `ticket_messages`
- Integrationen → `integrations`
- Konkurrenzvergleich → `competitors`
- Automation Builder → `automations`
- Tool Freischaltung → `customer_modules`
