
# MMOS v18 Admin Customer Flow QR Fullbuild

Umgesetzt:
- Admin Booking Detailansicht repariert.
- Admin Booking Kundensuche ergänzt.
- Admin Media Center mit Kundensuche.
- Uploads landen beim ausgewählten Kunden im passenden CRM-Bereich.
- Sidebar-Kundensuche unter MMOS entfernt.
- Globale Kundensuche oben repariert und öffnet CRM Detail.
- CRM Feld Ansprechpartner ergänzt.
- Paketfreigabe ohne Tool-Auflistung.
- Individuelle Toolfreigabe pro Kunde ergänzt.
- Admin Rechnungen mit Dropdown/Freitext für Leistungsart.
- Aktivitäten aus Navigation entfernt.
- Workflows erzeugen Notifications bei Erfüllung.
- Kundenbereich Tickets erstellen wieder hinzugefügt.
- Kundenpakete zeigen exakt paketbezogene Tools.
- QR-Code Tool im Adminbereich ergänzt mit Kundensuche, interner E-Mail, Sterneregeln und Google-Link.

Deploy:
1. Supabase Patch ausführen:
   `supabase/migrations/0017_v18_admin_customer_flow_qr_patch.sql`
2. Railway Backend aus dieser ZIP redeployen.
3. Vercel Frontend aus dieser ZIP redeployen.
