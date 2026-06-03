# MMOS V083 · QR Slug Token Context Hotfix

Fixes:

- `/q/[slug] -> /l/[slug]` bleibt korrekt, aber Scan-Token wird nun zusätzlich in `sessionStorage` gesichert.
- `/l/[slug]` nutzt den Scan-Token aus der URL oder als Fallback aus der aktuellen QR-Session.
- Öffentliche Loyalty-Endpunkte lösen den Kontext jetzt über QR-Kampagnen-Slug **oder** Loyalty-Programm-Slug auf.
- Alte Kampagnen mit unterschiedlichem QR-Slug und Loyalty-Programm-Slug können dadurch weiterhin Punkte buchen.
- Punkte sammeln ist robuster, wenn QR-Kampagne und Loyalty-Programm historisch unterschiedlich verknüpft wurden.

Wichtig:

Der Redirect von `/q/...` auf `/l/...?scan_token=...` ist technisch korrekt. `/q` erzeugt nur den frischen Scan-Token, `/l` ist die Endkunden-Seite.
