# V096 – Rückhol-Testmail Link-Hotfix

## Problem
Die Testmail enthielt bisher einen statischen Demo-Token (`test-token`). Dieser Token wurde nicht in `customer_reactivation_links` gespeichert. Beim Öffnen der Testmail erschien deshalb: „Rückhol-Link nicht gefunden“.

## Lösung
- Die Testmail erzeugt jetzt einen echten temporären Test-Link in `customer_reactivation_links`.
- Der Link ist 24 Stunden gültig.
- Der Link öffnet die echte `/reactivate/[token]`-Seite.
- Test-Links werden über `metadata.is_test_mail=true` und Status `test_*` markiert.
- Test-Öffnungen und Test-Einlösungen werden nicht als echte Reaktivierungs-KPI gezählt.
- Echte Rückholmails bleiben unverändert consent-pflichtig und einmalig einlösbar.

## Migration
Keine neue Migration erforderlich.
