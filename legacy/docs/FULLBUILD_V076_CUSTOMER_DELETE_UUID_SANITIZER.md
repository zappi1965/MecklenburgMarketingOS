# FULLBUILD V076 – Customer Delete + UUID Sanitizer

## Inhalt

- CRM: bestehende Kunden können im Adminbereich gelöscht werden.
- Verknüpfte kundenbezogene Datensätze werden nach Möglichkeit mit entfernt.
- Backend `/api/store` bereinigt leere UUID-Felder (`""`) vor Insert/Update zu `null`.
- Backend ignoriert leere Query-Parameter wie `customer_id=` beim Listenabruf.
- Frontend `storeClient.list` sendet keine leeren Query-Parameter mehr.
- Verkaufsworkflow speichert `workflow_id` bei fehlendem Workflow als `null` statt leerem String.

## Behobener Fehler

`/api/store/sales_workflow_events` konnte bei leerer `workflow_id` oder `customer_id` mit folgendem Fehler abbrechen:

```txt
invalid input syntax for type uuid: "" [22P02]
```

## Migration

Keine zwingende Migration erforderlich. `0104` ergänzt nur optionale Soft-Delete-Spalten für `customers`, damit Kundenlöschung sauberer nachvollziehbar bleibt.
