# V42.23.5 – Existing Customers as Demo Customers

This hotfix treats all customers that already exist at the time the SQL migration is run as demo customers.

## Result

- Live mode customer selectors and CRM lists hide those customers.
- The internal **Demo Umgebung** remains the place where demo customers can be opened.
- Newly created customers after the migration remain live customers because `customers.is_demo` defaults to `false`.

## Required SQL

Run:

```sql
SQL_V42_23_5_MARK_EXISTING_CUSTOMERS_AS_DEMO.sql
```

## Deployment

- Frontend: redeploy on Vercel
- Supabase: run the SQL file
- Backend/Railway: not required for this specific hotfix
