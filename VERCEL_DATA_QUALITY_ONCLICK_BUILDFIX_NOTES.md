# Vercel Buildfix — Data Quality onClick

Behoben:

```txt
./src/app/admin/data-quality/page.tsx:240:66
Type error: Type '(selectedCustomerId?: string) => Promise<void>' is not assignable to type 'MouseEventHandler<HTMLButtonElement>'.
```

Ursache:

```tsx
onClick={loadReviews}
```

React übergibt dabei das MouseEvent an `loadReviews`. Die Funktion erwartet aber optional eine `string` customer_id.

Fix:

```tsx
onClick={() => void loadReviews()}
```

Keine neue Supabase-Migration nötig.
