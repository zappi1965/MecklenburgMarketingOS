# MMOS V103 Fullbuild inkl. Scrollfix

Dieses Paket basiert auf der gelieferten `mmos-v103-counter-dashboard-only-hotfix-fullbuild.zip` und enthält ausschließlich den Scrollfix.

## Geändert

- `frontend/src/app/globals.css` wurde am Ende um `MMOS V103 FULLBUILD SCROLLFIX` ergänzt.
- Body-/HTML-Scroll wird für Firefox und Chrome explizit erlaubt.
- App-/Dashboard-Main-Wrapper werden auf `height:auto`, `max-height:none` und sichtbares vertikales Overflow gesetzt.
- Mobile Topbar/Bottom-Navigation bleiben erhalten; der Seiteninhalt soll wieder über den Body scrollen.

## Nicht enthalten

Der zuvor besprochene Security-/Punkte-/Audit-Hotfix wurde bewusst **nicht** integriert.

## Nach dem Einspielen

```bash
yarn install
yarn build
```

Dann neu deployen.
