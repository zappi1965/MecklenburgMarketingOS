# V42.23.3 – Demo-Kunden im Live-Modus ausblenden

## Ziel
Demo-Kunden sollen im Live-Adminbereich nicht mehr in normalen Kundenlisten, CRM-Suchen oder Kundenauswahlen erscheinen. Sie bleiben ausschließlich im internen Reiter `Demo Umgebung` erreichbar.

## Umsetzung
- `allCustomers()` gibt im Live-Modus nur noch echte Kunden zurück.
- Demo-Kunden werden über `is_demo = true` oder Namen mit Prefix `DEMO ` erkannt.
- Der Reiter `Demo Umgebung` nutzt eine eigene Demo-Kundenliste und zeigt Demo-Kunden weiterhin dort an.
- Die globale Kundensuche, Sidebar-Suche und alle Kundenauswahlfelder nutzen dadurch automatisch keine Demo-Kunden mehr im Live-Modus.
- Der Sidebar-Modus zeigt jetzt `LIVE MODE` oder `DEMO MODE`, statt immer `DEMO MODE` anzuzeigen.

## Deployment
Nur Frontend/Vercel redeployen. Backend/Railway und Supabase-SQL sind nicht erforderlich.
