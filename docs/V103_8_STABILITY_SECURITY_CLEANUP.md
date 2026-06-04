# MMOS V103.8 – Stabilitäts- und Security-Cleanup

Umgesetzt auf Basis V103.7, additiv und ohne neue Dependencies.

## 1. Stempelkarten-Logik korrigiert
Die öffentliche Slugseite nutzt für die Stempelkarte nicht mehr rohe Punkte als Stempel.

Priorität:
1. `member.total_scans`
2. Fallback: `points_balance / points_per_stamp`

Neue Einstellung:
- `points_per_stamp`, Default `10`

Damit führt ein Scan mit 10 Punkten nicht mehr automatisch zu `10/10 Stempeln`, sondern zu einem echten Stempel bzw. einem konfigurierbaren Punkte-zu-Stempel-Verhältnis.

## 2. Version-/Runtime-Check
Neue Endpoints:
- Backend: `/api/version`
- Backend: `/api/system/runtime`
- Frontend: `/api/runtime`

Damit ist schneller erkennbar, welche Version wirklich auf Vercel/Railway läuft.

## 3. Direkt-Backend für Admin/MFA deaktiviert
Der V33-Client nutzt weiterhin zuerst den same-origin Next Proxy.
Private/Admin-Aufrufe verwenden keinen direkten Public-Railway-Fallback mehr, außer explizit:

```env
NEXT_PUBLIC_ENABLE_PRIVATE_BACKEND_FALLBACK=true
```

Public Fallback ist ebenfalls opt-in:

```env
NEXT_PUBLIC_ENABLE_PUBLIC_BACKEND_FALLBACK=true
```

## 4. localStorage-Rollenfallback im Live-Modus entfernt
`mmos_role` und `mmos_customer_id` werden in Live nicht mehr als Rollenquelle akzeptiert.
Fallbacks sind nur noch in explizitem Demo-Modus erlaubt.

Betroffen:
- `authClient.ts`
- `RoleGate.tsx`
- `ToolAccessGate.tsx`
- `app/page.tsx`

## 5. Review-Gating neutralisiert
Der Google-Link auf der Slugseite wird nicht mehr nur bei `rating >= 4` angezeigt.
Text wurde neutralisiert:

> Danke für dein Feedback. Wenn du möchtest, kannst du deine Erfahrung zusätzlich öffentlich auf Google teilen – unabhängig davon, wie deine Bewertung ausgefallen ist.

## 6. CSS-/Scroll-Cleanup
`MmosScrollUnlock` ist nicht mehr standardmäßig aktiv.
Aktivierung nur temporär über:

```env
NEXT_PUBLIC_SCROLL_RESCUE=true
```

oder per URL:

```text
?scroll_rescue=1
```

Zusätzlich wurden Public-Slug-spezifische Scroll-Regeln ergänzt, damit `/l/[slug]` nicht durch Admin-/App-Shell-Regeln blockiert wird.

## 7. Tenant-Isolation-Test
Neues Script:

```bash
yarn tenant:isolation:smoke
```

Benötigte ENV:

```env
BACKEND_URL=https://...
TENANT_A_TOKEN=...
TENANT_A_CUSTOMER_ID=...
TENANT_B_CUSTOMER_ID=...
TENANT_B_TOKEN=optional
```

Das Script prüft typische Cross-Tenant-Zugriffe und erwartet 401/403 für Fremdkundendaten.

## 8. Service-Role aus Vercel Public Review Route entfernt
`frontend/src/app/api/public/review-feedback/route.ts` schreibt nicht mehr direkt per Supabase Service Role.
Die Route proxyt jetzt an das Railway-Backend:

```text
/api/v33-functional/public/loyalty/[slug]/review
```

Wenn kein `slug` im Payload enthalten ist, wird die Anfrage bewusst abgelehnt.

## 9. Public Shield persistent gemacht
Der Public Shield nutzt jetzt Supabase-Persistenz mit Memory-Fallback.

Neue Tabelle:
- `public.public_endpoint_shield_attempts`

Neue ENV optional:

```env
PUBLIC_SHIELD_PERSISTENT=true
PUBLIC_SHIELD_SALT=langen-zufaelligen-salt-setzen
```

Fallback auf Memory, falls die Migration noch nicht ausgeführt wurde.

## Migration
Neue Migration:

```text
supabase/migrations/0103_8_stability_security_cleanup.sql
```

Sie ist defensiv/additiv und löscht keine Daten.

## Geänderte Hauptdateien
- `frontend/src/app/l/[slug]/page.tsx`
- `frontend/src/components/MmosScrollUnlock.tsx`
- `frontend/src/lib/v33FunctionalClient.ts`
- `frontend/src/lib/authClient.ts`
- `frontend/src/components/security/RoleGate.tsx`
- `frontend/src/components/security/ToolAccessGate.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/api/public/review-feedback/route.ts`
- `frontend/src/app/api/runtime/route.ts`
- `backend/src/server.js`
- `backend/src/services/publicEndpointShieldService.js`
- `backend/src/routes/v33FunctionalRoutes.js`
- `scripts/v1038-tenant-isolation-smoke.mjs`
- `supabase/migrations/0103_8_stability_security_cleanup.sql`
