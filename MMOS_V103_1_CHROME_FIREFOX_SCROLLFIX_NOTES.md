# MMOS V103.1 Chrome/Firefox Scrollfix

Diese Fullbuild basiert auf der gelieferten V103 und enthält einen stärkeren Scrollfix.

## Ursache
V103 nutzt eine 100dvh-App-Shell:

```tsx
<div className="app appLike">
  <aside className="side" />
  <main className="main appMainShell" />
</div>
```

In der CSS lag weiterhin eine ältere Regel:

```css
.main { overflow: hidden; }
```

Dadurch konnte Chrome/Firefox Inhalte zwar rendern, aber der sichtbare Hauptbereich wurde nicht zuverlässig scrollbar. Der erste Fix hat Body-Scroll erzwungen; bei dieser App-Shell muss auf Desktop aber `main.appMainShell` selbst der Scroll-Container sein.

## Änderung
Desktop/Tablet ab 861px:

- `html/body` werden auf Viewport-Höhe fixiert.
- `.app.appLike` bleibt eine 100dvh-Shell.
- `.side` scrollt separat.
- `.main.appMainShell` ist jetzt der eigentliche Scroll-Container mit `overflow-y:auto !important`.
- Die Topbar bleibt sticky im Main-Scrollbereich.

Mobile bis 860px:

- Body-Scroll bleibt erlaubt.
- `.main.appMainShell` ist nicht fixiert, damit Topbar/Bottomnav sauber funktionieren.

## Test
Nach Deploy in Chrome/Firefox:

1. Login/App öffnen.
2. Dashboard mit mehreren Cards/Tools öffnen.
3. Mit Mausrad/Trackpad im Hauptbereich scrollen.
4. Sidebar separat testen.
5. Mobile Ansicht testen: Menü öffnen/schließen, dann Seite scrollen.

