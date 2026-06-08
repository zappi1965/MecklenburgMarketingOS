# V42.17 Business Tools Fullbuild

## Neue Kunden-Tools
- Kunden Wissenscenter
- Lokaler Wettbewerber Vergleich

## Neue Admin-Tools
- Google Business Audit Tool
- Mini-Audit Generator
- Lead Scraper / Lead Finder
- Angebotsgenerator
- Vertragsgenerator
- Kunden-Erfolgsampel
- Rechnungs- und Mahnwesen
- Health Center Erweiterung

## Backend
- Neue Route: `/api/business-tools/health`
- Neue Route: `/api/business-tools/google-business-audit`
- Neue Route: `/api/business-tools/lead-search`
- Google Places API wird genutzt, wenn `GOOGLE_PLACES_API_KEY` in Railway gesetzt ist.
- Ohne API-Key wird ein kontrollierter Demo-Fallback verwendet.

## Supabase
Optional: `SQL_V42_17_BUSINESS_TOOLS.sql` ausführen, damit neue Tabellen persistent in Supabase gespeichert werden.
Wenn die Tabellen fehlen, fällt das Frontend weiter lokal zurück.

## Deployment
- Frontend auf Vercel deployen
- Backend auf Railway deployen
- Optional `GOOGLE_PLACES_API_KEY` setzen
- Optional SQL in Supabase ausführen
