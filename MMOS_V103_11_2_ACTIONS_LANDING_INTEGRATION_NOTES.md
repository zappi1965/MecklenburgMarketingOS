# MMOS V103.11.2 – Aktionen & Angebote + Landingpage V26

## Umsetzung

### 1. Deal der Woche neu eingeordnet
- UI-Label auf **Aktionen & Angebote** geändert.
- In der QR-Verwaltung als eigener Tab integriert.
- Trennung im UI erklärt:
  - **Bonusaktion**: doppelte Punkte, Extra-Stempel, Bewertungsbonus → QR-Zielseite.
  - **Angebotsaktion**: konkretes Wochenangebot, Rabatt, Happy Hour, Produktdeal → Aktionen & Angebote.
- Bestehende Routen bleiben aus Kompatibilitätsgründen erhalten:
  - `/marketing/deals`
  - `/admin/marketing/deals`
  - `/deal/[slug]`

### 2. Landingpage ersetzt
- Neue Landingpage V26 als React-Komponente eingebunden:
  - `frontend/src/components/public/CustomerLandingV26.tsx`
- Gastansicht auf `/` rendert jetzt die neue Landingpage.
- Login/Register-Link auf `/auth` korrigiert.
- Desktop-Navigation erhält ebenfalls „Einloggen / Registrieren“.
- Globale Legal-Footer-Dopplung wird auf der Landingpage ausgeblendet, da die Landingpage eigene Footerlinks besitzt.
- Layout-Metadaten auf neue Landingpage angepasst.

## Geänderte Hauptdateien
- `frontend/src/app/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/public/CustomerLandingV26.tsx`
- `frontend/src/components/marketing/DealBuilder.tsx`
- `frontend/src/lib/toolRegistry.ts`
- `frontend/src/app/marketing/deals/page.tsx`
- `frontend/src/app/admin/marketing/deals/page.tsx`
- `backend/src/routes/dealCampaignRoutes.js`
- `backend/src/routes/v33FunctionalRoutes.js`
- `backend/src/services/dealCampaignService.js`

## Deployment-Hinweis
Frontend muss neu deployed werden. Backend nur neu deployen, wenn die geänderten Kommentar-/Labeltexte ebenfalls im Deploy enthalten sein sollen; funktional ist für diese Version vor allem das Frontend relevant.
