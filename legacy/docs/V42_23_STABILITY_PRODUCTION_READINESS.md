# V42.23 Stability & Production Readiness

Dieser Build härtet den Livebetrieb von MMOS, nachdem Adminprofile, Kunden-Invite-Flow, interne Demo-Umgebung und Mobile-UX eingebaut wurden.

## Schwerpunkte

- Browser-Alerts wurden durch App-Toasts/Fallback-Meldungen ersetzt.
- Demo-/Live-Trennung wurde sicherer gekapselt.
- Adminprofile haben stärkere Passwortregeln.
- Der letzte aktive Admin kann nicht gesperrt werden.
- Kunden-Einladungen können widerrufen und erneuert werden.
- Einladungen haben Ablaufdatum und werden als used/accepted markiert.
- Activity Log wurde für Admin-/Invite-/Freigabeaktionen erweitert.
- Health Center zeigt Integrations-/ENV-Status klarer an.
- System-Schema listet V42.21.5 und V42.23 Migrationen.
- Slug-Login hat Rate-Limit-Schutz gegen Fehlversuche und vorbereitete Passwort-Reset-Anfrage.

## Deployment

- Frontend: Vercel redeployen
- Backend: Railway redeployen
- Supabase: `SQL_V42_23_STABILITY_PRODUCTION_READINESS.sql` ausführen

## Neue/optionale ENV

```env
ADMIN_PASSWORD_MIN_LENGTH=10
PUBLIC_AUTH_RATE_LIMIT_MAX=8
PUBLIC_AUTH_RATE_LIMIT_WINDOW_MS=900000
```

## Hinweise

Der Passwort-Reset für Slug-Endkunden ist vorbereitet und protokolliert Reset-Anfragen. Für echten E-Mail-Versand muss ein Mailanbieter aktiv angebunden sein.
