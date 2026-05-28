# V42.24 Security & Privacy Center

Enthält:
- Verdachts-Score pro Loyalty-Endkunde
- einstellbares Punkte-Tageslimit pro Endkunde
- Security Center mit integriertem System Health
- kundenscharfe RLS-/customer_id-Härtung
- DSGVO-Anfragen für Auskunft, Export, Löschung/Anonymisierung

Deployment:
1. Frontend auf Vercel redeployen
2. Backend auf Railway redeployen
3. SQL_V42_24_SECURITY_PRIVACY_CENTER.sql in Supabase ausführen

Hinweis: Die RLS-Härtung setzt voraus, dass Live-Admins in `user_profiles` mit `role=admin` und `status=active` gepflegt sind und Kunden-Logins über `customer_users.customer_id` verbunden sind.
