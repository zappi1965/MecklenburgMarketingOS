# MMOS Login Mobile Optimization

## Umgesetzt

Die Login-/Auth-Seite wurde mobil optimiert.

Betroffene Seiten:
- `/auth`
- `/auth/register` leitet weiterhin auf `/auth`
- `/auth/update-password` profitiert durch globale Auth-CSS-Regeln

## Anpassungen

### Mobile Layout
- `authShell` scrollt jetzt sauber vertikal
- Safe-Area Insets für iPhone berücksichtigt
- Login-Karte wird auf Mobile oben ausgerichtet statt mittig abgeschnitten
- kleinere Innenabstände auf Mobile
- responsive Headline
- Buttons und Inputs mit mindestens 44px Touchhöhe
- 16px Input-Schriftgröße gegen iOS-Zoom
- Landscape-Modus optimiert
- sehr schmale Displays unter 380px berücksichtigt

### Login UX
- E-Mail-Feld nutzt `type=email`, `inputMode=email`, `autoComplete=email`
- Telefonfeld nutzt `inputMode=tel`
- Passwortfelder nutzen passende AutoComplete-Werte
- Enter im Passwortfeld startet Login
- Auth-Tab Buttons sind explizit `type=button`
- Login/Register Tabs brechen auf sehr schmalen Displays sauber um

## Status

UI-seitig angebunden:
- ja, alle zuletzt umgesetzten Module haben Seiten/Routen/Navigation.
- Login-Seite wurde jetzt zusätzlich explizit mobile-optimiert.

Nicht vollständig garantiert:
- Eine echte Geräteprüfung auf jedem iPhone/Android-Viewport ersetzt das nicht. Nach Deployment bitte `/auth` auf echtem Smartphone testen.
