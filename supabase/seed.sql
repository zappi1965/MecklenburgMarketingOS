
insert into clients (id, name, slug, owner_email, google_review_link, demo_revenue, subscription_status, modules)
values (
  'c_friseur',
  'Friseur Profi',
  'friseur-profi',
  'dominiquezapf@gmail.com',
  'https://www.google.com/search?q=friseur+profi+rezensionen',
  299,
  'active',
  '{"reviews":true,"crm":true,"booking":true,"chatbot":true,"whatsapp":true,"seo":true,"analytics":true,"invoices":true,"websites":true,"automations":true,"outreach":true,"reputation":true,"reports":true,"qr":true,"onboarding":true,"sales-assistant":true,"proposals":true,"suite":true}'::jsonb
)
on conflict (id) do nothing;
