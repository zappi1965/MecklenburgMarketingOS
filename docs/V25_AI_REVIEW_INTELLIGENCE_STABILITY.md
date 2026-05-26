# MMOS V25 – AI Review Intelligence + Stability Fullbuild

## Umgesetzt

### AI Review Intelligence
Unterordnung:
- Adminbereich: Reviews / CRM / Customer Intelligence / AI Assistant
- Kundenbereich: Reviews / Analytics

Funktionen:
- Sentiment-Analyse: positiv, neutral, negativ
- Sentiment Score
- Themen-Erkennung über Review Topic Dictionary
- Kritikpunkte
- Lobpunkte
- wiederkehrende Probleme
- wiederkehrendes Lob
- automatische Antwortvorschläge
- kritische Review-Eskalation
- automatische CRM-Timeline-Events
- automatische AI-Assistant-Hinweise
- automatische Ticket-Erstellung bei kritischem Feedback

### Neue Datenverknüpfungen

Reviews → Review Intelligence  
Review Intelligence → CRM Timeline  
Review Intelligence → AI Business Assistant  
Review Intelligence → Tickets  
Review Intelligence → Customer Health / Customer Intelligence nutzbar  
Review Intelligence → Paketlogik Growth/Premium  

## Hotfixes & Stabilitätsfixes

- optionale Spalten für Rechnungen, Pipeline, Tickets, Subscriptions und Tool Access abgesichert
- zentraler `safeDbService`
- zusätzlicher Backend Error Handler, falls im Basisbuild keiner vorhanden war
- Deduplizierung von Route-Imports / `app.use`-Zeilen
- Review Intelligence arbeitet auch ohne OpenAI API Key regelbasiert
- Antworttemplates und Topic Dictionary werden per SQL vorbereitet

## Neue Tabellen

- `review_intelligence_profiles`
- `review_intelligence_items`
- `review_topic_dictionary`
- `review_response_templates`

## Erweiterte Tabellen

- `review_feedback.intelligence_status`
- `review_feedback.sentiment`
- `review_feedback.detected_topics`
- `review_feedback.suggested_response`

## Neue Backend Route

`/api/review-intelligence`

## Neue Frontend-Dateien

- `reviewIntelligenceClient.ts`
- `ReviewIntelligencePanel.tsx`

## Paketzuordnung

Growth:
- Review Intelligence Basis

Premium:
- AI Review Intelligence Plus

## Deploy

1. Supabase SQL ausführen:
`0037_v25_ai_review_intelligence_stability.sql`

2. Backend redeployen

3. Frontend redeployen

## Hinweis

Die Analyse ist aktuell regelbasiert und ohne API-Key funktionsfähig.
Später kann OpenAI ergänzt werden, um freie Texte noch tiefer zu clustern, bessere Antwortvorschläge zu schreiben und Trends semantisch zu erkennen.
