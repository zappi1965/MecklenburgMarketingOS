# MMOS V37 Loyalty Branding & Rules Builder Fullbuild

## Umgesetzt im Loyalty Programm

### Branding der Landingpage
- Kundenname in geschwungener Schrift
- Schriftart-Auswahl:
  - Pacifico
  - Great Vibes
  - Dancing Script
  - Georgia
- Primärfarbe
- Sekundärfarbe
- Hero Headline
- Hero Subline
- mobile optimierte Brand Preview

### Reward-Regeln
- Ablaufdatum von Rewards
- maximale Einlösungen pro Reward
- maximale Einlösungen pro Kunde
- Tageslimit
- Wochenlimit

### Scan Limits
- Tageslimit für QR Scans pro Member
- Wochenlimit für QR Scans pro Member

### Automatische Level-Up-Regeln
- Basic
- Silver
- Gold
- VIP
- eigene Level ergänzbar
- Punkte-Schwellen
- Multiplikatoren

### Geburtstagsbonus
- Punktewert konfigurierbar
- Bonusbuchung per Member E-Mail oder Token
- Transaktion wird gespeichert
- Level wird neu geprüft

### Referral-/Empfehlungsbonus
- Bonus für Empfehlenden
- Bonus für geworbenen Kontakt
- Referral Lead wird erzeugt
- Timeline Event wird erzeugt
- Engine berechnet Scores neu

### QR-Code-Design
- Style-Auswahl:
  - Luxury
  - Minimal
  - Bold
  - Classic
- Vordergrundfarbe
- Hintergrundfarbe
- QR Logo Text / Badge
- mobile optimierte Vorschau

## Neue Endpunkte

```text
GET  /api/v33-functional/v37/loyalty/:customer_id/settings
POST /api/v33-functional/v37/loyalty/:customer_id/settings
POST /api/v33-functional/v37/loyalty/:customer_id/rewards
POST /api/v33-functional/v37/loyalty/:customer_id/referral
POST /api/v33-functional/v37/loyalty/:customer_id/birthday-bonus
```

## SQL

Zusätzlich ausführen:

```text
supabase/migrations/0044_v37_loyalty_branding_rules_builder.sql
```

## Wichtig

Dieses Modul ist im bestehenden Bereich eingeordnet:

```text
QR & Loyalty
→ Loyalty Programm
→ Loyalty Branding & Rules Builder
```
