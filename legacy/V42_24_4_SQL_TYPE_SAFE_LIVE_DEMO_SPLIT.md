# V42.24.4 – SQL Type Safe Live/Demo Split

## Grund
Supabase meldete bei der Live/Demo-Trennmigration:

`ERROR: 42883: operator does not exist: text = uuid`

Ursache: Einige Tabellen speichern `customer_id` als `text`, während `public.customers.id` als `uuid` angelegt ist. PostgreSQL vergleicht `text = uuid` nicht automatisch.

## Fix
Alle Demo-Markierungen über `customer_id` vergleichen IDs jetzt typensicher als Text:

```sql
customer_id::text in (
  select id::text from public.customers where coalesce(is_demo,false) = true
)
```

Zusätzlich wurden indirekte Verknüpfungen typensicher gemacht:

- `ticket_messages.ticket_id::text = tickets.id::text`
- `dunning_cases.invoice_id::text = invoices.id::text`
- `mini_audits.audit_id::text = google_business_audits.id::text`

## Wichtig
Die Migration bleibt nicht-destruktiv:

- keine Demo-Kunden löschen
- keine Demo-Rechnungen löschen
- keine `demo_*` Tabellen leeren
- Demo-Daten bleiben erhalten
- Live-Daten werden über `is_demo=false` getrennt
