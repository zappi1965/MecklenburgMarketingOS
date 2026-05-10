
async function providerStatus() {
  return {
    smtp: !!process.env.SMTP_HOST,
    whatsapp: !!process.env.WHATSAPP_ACCESS_TOKEN,
    google: !!process.env.GOOGLE_CLIENT_ID,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    lexoffice: !!process.env.LEXOFFICE_API_KEY,
    supabase: !!process.env.SUPABASE_URL,
    redis: !!process.env.REDIS_URL,
    sentry: !!process.env.SENTRY_DSN
  };
}

async function sendEmail(payload) {
  if (!process.env.SMTP_HOST) return { mock: true, provider: "smtp", payload };
  // Real nodemailer implementation can be added here.
  return { sent: true };
}

async function publishSocial(payload) {
  // Meta/LinkedIn/Google Provider placeholder.
  return { mock: true, provider: "social", payload };
}

async function createInvoice(payload) {
  if (!process.env.LEXOFFICE_API_KEY) return { mock: true, provider: "lexoffice", payload };
  return { created: true };
}

module.exports = { providerStatus, sendEmail, publishSocial, createInvoice };
