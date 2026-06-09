-- POS-Bridge (SumUp), Predictive No-Show, AI-Chatbot-Logs.
-- Idempotent.

-- POS-Transaktionen (SumUp + spaeter Lightspeed / GastroSoft).
create table if not exists public.pos_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null,                          -- 'sumup' | 'lightspeed' | 'gastrosoft'
  provider_transaction_id text not null,           -- externe ID, unique pro provider
  amount numeric(12,2) not null,
  currency text not null default 'EUR',
  payment_type text,                               -- 'card' | 'cash' | 'wallet'
  status text not null,                            -- 'pending' | 'successful' | 'failed' | 'refunded'
  transaction_time timestamptz not null,
  invoice_id uuid,                                 -- backfill nach Match
  tse_transaction_id uuid,                         -- backfill nach TSE-Sign
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create index if not exists idx_pos_transactions_customer on public.pos_transactions(customer_id);
create index if not exists idx_pos_transactions_status on public.pos_transactions(status);
create index if not exists idx_pos_transactions_time on public.pos_transactions(transaction_time desc);

-- Predictive No-Show: pro Appointment ein Risiko-Score.
create table if not exists public.appointment_risk_scores (
  appointment_id uuid primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  risk_score int not null default 0,               -- 0..100
  risk_level text not null default 'low',          -- low | medium | high
  reasons jsonb not null default '[]'::jsonb,
  features jsonb not null default '{}'::jsonb,
  reminder_strategy text not null default 'standard', -- standard | high_touch | confirm_required
  calculated_at timestamptz not null default now()
);

create index if not exists idx_appointment_risk_scores_customer on public.appointment_risk_scores(customer_id);
create index if not exists idx_appointment_risk_scores_level on public.appointment_risk_scores(risk_level);

-- AI-Chatbot-Conversations auf der oeffentlichen Slug-Seite.
create table if not exists public.chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  slug text,
  visitor_token text,                              -- anonyme Visitor-ID (Cookie-frei)
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  message_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  role text not null,                              -- 'user' | 'assistant' | 'system'
  content text not null,
  tokens_used int,
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_conversations_customer on public.chatbot_conversations(customer_id);
create index if not exists idx_chatbot_conversations_slug on public.chatbot_conversations(slug);
create index if not exists idx_chatbot_messages_conv on public.chatbot_messages(conversation_id, created_at);

alter table public.pos_transactions enable row level security;
alter table public.appointment_risk_scores enable row level security;
alter table public.chatbot_conversations enable row level security;
alter table public.chatbot_messages enable row level security;
