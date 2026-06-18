# MecklenburgMarketingOS — Projekt-Gedächtnis

Dieses Dokument wird vom MMOS-Dev-Agent bei jedem Start automatisch geladen.
Halte es aktuell — der Agent liest es bei jedem Run.

## Projekt

**MecklenburgMarketingOS (MMOS)** — deutsches B2B SaaS Marketing-OS für lokale KMUs in MV.
Zielgruppen: Friseursalons, Restaurants, Handwerk, Hotels, Kosmetik, Fitness, Praxen.

- GitHub: `zappi1965/MecklenburgMarketingOS`
- Backend: Railway (Port 4000)
- Frontend: Vercel
- DB: Supabase Frankfurt

## Aktuelle Architektur

```
backend/
  src/
    routes/          Express-Routen (Route-Factory-Pattern)
    services/        Business-Logik, AI-Services
    middleware/      auth.js, errorHandler.js
    lib/             supabaseAdmin.js, stripe.js
  db/migrations/     SQL (001_..., 002_..., usw.)
  server.js

frontend/
  src/
    app/             Next.js App Router
    components/
      admin/         AdminAiAssistant.tsx (AI-Bot-Panel)
      ui/            Basis-Komponenten
    lib/             API-Clients, Utils
```

## Code-Patterns

### Backend Route (immer so)
```javascript
module.exports = (supabaseAdmin) => {
  const router = express.Router()
  
  router.get('/endpoint', authMiddleware, rateLimit(...), async (req, res, next) => {
    try {
      const { data, error } = await supabaseAdmin.from('tabelle').select('*')
      if (error) throw new Error(error.message)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })
  
  return router
}
```

### In server.js registrieren
```javascript
const myRoutes = require('./routes/myRoutes')
app.use('/api/my', authMiddleware, myRoutes(supabaseAdmin))
```

### Supabase Admin
```javascript
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
// ODER: supabaseAdmin als Parameter aus Route-Factory
```

### Anthropic API
```javascript
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: '...',
    messages: [{ role: 'user', content: '...' }]
  })
})
```

### Frontend API Call
```typescript
const res = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
const data = await res.json()
if (!data.ok) throw new Error(data.error)
```

## Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `backend/src/server.js` | Entry-Point, alle Routen registriert hier |
| `backend/src/middleware/auth.js` | JWT-Auth, setzt req.user |
| `backend/src/lib/supabaseAdmin.js` | Supabase Admin Client |
| `backend/src/routes/adminAiRoutes.js` | AI-Bot-Routes (Agent, Chat, GitHub, PDF) |
| `backend/src/services/agentService.js` | Agentic Loop (Kern des AI-Bots) |
| `frontend/src/app/layout.tsx` | Root Layout |
| `frontend/src/components/admin/AdminAiAssistant.tsx` | AI-Bot-Panel (6 Tabs) |

## Datenbank-Tabellen

### Kern
- `users` — Accounts (id, email, password_hash, subscription_tier, twofa_secret, twofa_enabled)
- `businesses` — Business-Profile (id, user_id, slug, name, type, address, phone, email)
- `bookings` — Terminbuchungen (id, business_id, customer_name, customer_email, start_at, end_at)
- `reviews` — Bewertungen (id, business_id, rating, text, created_at)
- `social_posts` — KI-Posts (id, business_id, platform, content, status, scheduled_at)

### AI-Bot
- `mmos_agents` — Agent-Registry (slug, name, system_prompt, allowed_tools)
- `mmos_skills` — Skill-Registry (slug, name, prompt_template, category)
- `mmos_agent_memory` — Session-Gedächtnis (task, summary, files, created_at)

### Subscriptions
- `subscriptions` — Stripe/PayPal Subscriptions (user_id, tier, status, stripe_subscription_id)
- `invoices` — Rechnungen (subscription_id, amount, currency, pdf_url, paid_at)

## Subscription-Tiers

| Tier | Preis | Features |
|------|-------|---------|
| free | 0€ | 1 Business, Basis-Features |
| starter | 29€/Monat | 3 Businesses, AI-Chat |
| professional | 79€/Monat | 10 Businesses, AI-Agent, alle Features |
| enterprise | 199€/Monat | Unbegrenzt, White-Label, Support |

## Umgebungsvariablen (Backend)

```
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...

# AI
AI_PROVIDER=anthropic          # anthropic | groq | ollama | mock
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
AGENT_PROVIDER=groq            # separater Provider für den Agent
MCP_SERVERS=name:http://host:port  # optionale MCP-Server

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_REPO_OWNER=zappi1965
GITHUB_REPO_NAME=MecklenburgMarketingOS

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Auth
JWT_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limits
ADMIN_AI_RATE_LIMIT_PER_MIN=30
AGENT_RUNS_PER_HOUR=10
AGENT_MAX_STEPS=40
```

## Sicherheits-Checkliste (bei jeder Änderung prüfen)

- [ ] Keine persönlichen Daten in Logs (DSGVO)
- [ ] Auth-Middleware auf alle Admin-Endpoints
- [ ] Rate-Limiting auf KI-Endpoints
- [ ] SQL-Injection: nur Supabase-SDK, kein String-Concat
- [ ] Stripe-Webhook: Signatur validieren
- [ ] 2FA: speakeasy mit `window: 1`
- [ ] Neue Env-Vars in Railway + Vercel dokumentieren
- [ ] RLS-Policies für neue Supabase-Tabellen prüfen

## Bekannte Eigenheiten & Fallstricke

1. **Route-Registrierung in server.js vergessen** — häufigster Fehler bei neuen Routen
2. **`require()` vs `import`** — Backend ist CommonJS, KEIN ESM
3. **Supabase RLS** — neue Tabellen haben standardmäßig keine RLS-Policies → Daten unsichtbar
4. **Next.js App Router** — `'use client'` nur wenn wirklich nötig (useState, Events)
5. **Railway Restart** — Env-Vars erst nach Restart aktiv
6. **Stripe Webhooks** — `express.raw()` vor `express.json()` für Webhook-Route nötig
7. **2FA window** — `speakeasy.totp.verify()` braucht `window: 1` sonst Clock-Drift-Fehler

## Kürzlich geänderte Bereiche (aktuell halten!)

- `backend/src/routes/adminAiRoutes.js` — AI-Bot-Routes (Agent, MCP, Chat mit Bildern)
- `backend/src/services/agentService.js` — Agentic Loop mit MCP-Integration
- `backend/src/services/mcpClientService.js` — NEU: MCP HTTP-Transport-Client
- `frontend/src/components/admin/AdminAiAssistant.tsx` — AI-Panel (Bild-Upload, MCP-Status)
- `backend/db/migrations/003_mmos_agents_skills.sql` — Agent/Skill-Tabellen
- `backend/db/migrations/004_mmos_agent_memory.sql` — Agent-Gedächtnis-Tabelle
