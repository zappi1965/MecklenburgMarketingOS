# MMOS V30.1 Vercel Build Fix

## Fehler

Vercel brach in `frontend/src/app/page.tsx` ab:

```text
Parsing ecmascript source code failed
line 470
```

## Ursache

Nach dem Render von `DemoCustomers` fehlte die schließende JSX-Klammer:

```tsx
{view==='demo_customers'&&role==='admin'&&<DemoCustomers store={store}/>
```

## Fix

Korrigiert zu:

```tsx
{view==='demo_customers'&&role==='admin'&&<DemoCustomers store={store}/>}
```

Danach folgt sauber der neue V30-Tool-Renderblock.

## Geänderte Datei

`frontend/src/app/page.tsx`
