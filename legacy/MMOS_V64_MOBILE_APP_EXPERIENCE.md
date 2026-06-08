# MMOS v0.64 – Mobile App Experience

Ziel: Das Live-System soll auf iPhone/Android deutlich mehr wie eine App wirken, ohne Funktionen oder bestehende Tools zu entfernen.

## Umgesetzt

- Mobile App-Shell überarbeitet: feste obere App-Bar, Bottom-Navigation, bessere Safe-Area-Unterstützung für iOS/Android.
- Sidebar/Tool-Menü als App-Drawer verbessert, inklusive stärkerem Blur/Overlay und größeren Touch-Zielen.
- Dashboard-, Kunden- und Admin-Karten für Mobile optimiert: größere Touch-Flächen, bessere Abstände, weniger horizontales Überlaufen.
- Landingpage mobil app-artiger aufgebaut: Hero, Demo-Audit, Paketkarten, Monatsbeweise und Trust-Bereich als mobile Karten/Slider.
- Paketanfrage-Formular als mobile Bottom-Sheet-Erlebnis optimiert.
- Formulare und Bearbeitungsbereiche mobil lesbarer gemacht, inklusive dunkler Sticky-Actions statt weißem Kontrastbruch.
- PWA/Manifest erweitert: Standalone Start-URL, Shortcuts, App-Metadaten und bessere Mobile-Web-App-Meta-Tags.

## Geänderte Dateien

- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/public/manifest.webmanifest`
- `manifest.json`

## Deployment

Nur Frontend/Vercel muss neu deployed werden. Backend, Worker und Supabase sind für diesen UI-Fix nicht erforderlich.
