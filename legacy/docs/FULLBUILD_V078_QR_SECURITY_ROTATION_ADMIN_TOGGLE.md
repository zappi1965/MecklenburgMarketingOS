# Fullbuild V078 – QR Security Hardening, QR-Rotation & Admin-Schalter entfernt

Umgesetzt:

- echte QR-Codes zeigen konsequent auf `/q/[slug]`
- `/l/[slug]` bleibt Zielseiten-/Preview-URL
- Punkte-QRs verlangen standardmäßig einen frischen Scan-Token
- Reload/Aktualisieren nach Punktevergabe bringt keine neuen Punkte
- optionaler Modus: nach erfolgreicher Teilnahme wird automatisch ein neuer QR-Code mit denselben Kampagnenparametern erzeugt
- alter QR wird bei Rotation deaktiviert, der neue QR wird aktiv
- QR-Tab zeigt Security-Status und Rotation an
- Admin-Schieberegler zwischen DominiqueMM und JanneMM wurde aus der Topbar entfernt

Neue Migration:

`supabase/migrations/0105_v078_qr_security_rotation_admin_toggle.sql`

Hinweis:

Der Rotationsmodus eignet sich vor allem für digitale QR-Anzeigen oder streng kontrollierte Einmal-QR-Prozesse. Für gedruckte QR-Codes sollte der Modus nur bewusst aktiviert werden.
