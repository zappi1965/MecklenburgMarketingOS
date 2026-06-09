# MMOS V30.3 Vercel JSX Build Fix

## Fehler

Vercel/Turbopack brach in `frontend/src/app/page.tsx` ab:

```text
Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
... <V30ToolModule view={view} store={store} cid={cid} role={role}/>}}
```

## Ursache

Beim V30-Renderblock war eine schließende JSX-Klammer zu viel.

## Fix

Geändert von:

```tsx
<V30ToolModule view={view} store={store} cid={cid} role={role}/>}}
```

zu:

```tsx
<V30ToolModule view={view} store={store} cid={cid} role={role}/>}
```

## Geänderte Datei

```text
frontend/src/app/page.tsx
```
