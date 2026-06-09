# MMOS V42.1 Vercel Type Hotfix

## Behobener Fehler

Vercel Build:
```text
Property 'updateLocalRecord' does not exist ...
Did you mean 'updateRecord'?
```

## Ursache

Ein älteres Demo-Tool in `frontend/src/app/page.tsx` nutzte noch:
```text
v33FunctionalClient.updateLocalRecord(...)
```

Der neue Client hatte aber nur:
```text
v33FunctionalClient.updateRecord(...)
```

## Fix

1. `page.tsx` wurde auf die neuen Methodennamen angepasst:
```text
updateLocalRecord -> updateRecord
createLocalRecord -> createRecord
deleteLocalRecord -> deleteRecord
```

2. Zusätzlich wurden im Client rückwärtskompatible Aliasse ergänzt:
```text
updateLocalRecord
createLocalRecord
deleteLocalRecord
```

Damit funktionieren ältere und neue Module.

## Geänderte Dateien

```text
frontend/src/lib/v33FunctionalClient.ts
frontend/src/app/page.tsx
docs/V42_1_VERCEL_TYPE_HOTFIX.md
```
