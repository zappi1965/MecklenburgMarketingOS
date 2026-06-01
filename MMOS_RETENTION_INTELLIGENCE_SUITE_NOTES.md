# MMOS Retention Intelligence Suite

## Umgesetzt

Neue Admin-Seite:
- `/admin/retention/intelligence`

Neue Backend-Routen:
- `GET /api/production/retention-intelligence/templates`
- `GET /api/production/retention-intelligence/overview/:customer_id`
- `POST /api/production/retention-intelligence/segments/:customer_id/create-defaults`
- `POST /api/production/retention-intelligence/feedback-actions/:customer_id/generate`
- `POST /api/production/retention-intelligence/service-recovery/:customer_id`
- `POST /api/production/retention-intelligence/reactivation-plan/:customer_id`

## Sinnvoll verknüpft und einsortiert

Die Suite verbindet folgende Tools:
- Kundensegment Builder
- Churn Prevention Center
- Customer Value Score
- Feedback-to-Action Board
- Service Recovery Tool
- Reaktivierungsplan für inaktive Kunden

## Inaktivitäts-Erkennung

Das System erkennt Kunden als reaktivierungsrelevant, wenn z. B.:
- letzte Aktivität >= 45 Tage
- früher aktiv, jetzt rückläufig
- Punkte vorhanden, aber keine Einlösung
- kritisches Feedback vorhanden
- Churn Score erhöht

Konkrete Vorschläge:
- Winback-Angebot vorbereiten
- persönliche Nachfassaufgabe erstellen
- Reward Reminder senden/vorbereiten
- Service Recovery Case anlegen
- VIP-Vorteil prüfen

## Datenhaltung

Keine neue Migration nötig:
- `v33_functional_records.resource = customer_segments`
- `v33_functional_records.resource = customer_segment_memberships`
- `v33_functional_records.resource = churn_risk_scores`
- `v33_functional_records.resource = customer_value_scores`
- `v33_functional_records.resource = retention_recommendations`
- `v33_functional_records.resource = feedback_action_items`
- `v33_functional_records.resource = service_recovery_cases`
- `v33_functional_records.resource = retention_reactivation_plans`

## Produktivlogik

- Keine automatische Kundenkontaktaufnahme.
- System erstellt Vorschläge und Entwürfe.
- Kritische Aktionen müssen bestätigt werden.
- Kontaktvorschläge beachten `consent_marketing`.
- Scores sind erklärbar durch Gründe.
- Daten werden customer-scoped verarbeitet.
