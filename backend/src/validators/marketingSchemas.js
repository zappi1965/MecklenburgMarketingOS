// Zod-Schemas für die Marketing-Tools (Deals, Mini-Website).
// Defensive Eingabevalidierung mit klaren 400-Fehlern.

const { z } = require('zod')

const optionalString = z.string().max(5000).optional().nullable()
const optionalUrl = z.union([z.string().url(), z.literal(''), z.null()]).optional()
const optionalDate = z.union([z.string().datetime({ offset: true }), z.string().length(0), z.null()]).optional()

const dealCreateSchema = z.object({
  title: z.string().min(1, 'Titel ist Pflicht').max(160),
  slug: z.string().max(60).optional(),
  subtitle: optionalString,
  body: optionalString,
  discount_label: z.string().max(60).optional().nullable(),
  image_url: optionalUrl,
  cta_label: z.string().max(80).optional().nullable(),
  cta_url: optionalUrl,
  starts_at: optionalDate,
  expires_at: optionalDate,
  status: z.enum(['draft', 'active', 'expired', 'archived']).optional()
}).passthrough()

const dealUpdateSchema = dealCreateSchema.partial()

const miniWebsiteUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  brand: z.object({ name: z.string().max(160).optional(), logo_url: optionalUrl, primary_color: z.string().max(20).optional() }).optional(),
  hero: z.object({ headline: z.string().max(200).optional(), subline: z.string().max(2000).optional(), image_url: optionalUrl }).optional(),
  hours: z.array(z.object({ day: z.string().max(40).optional(), open: z.string().max(20).optional(), close: z.string().max(20).optional() })).max(14).optional(),
  services: z.array(z.object({ name: z.string().max(160).optional(), price: z.string().max(60).optional(), note: z.string().max(200).optional() })).max(100).optional(),
  cta: z.object({ label: z.string().max(80).optional(), url: optionalUrl, phone: z.string().max(40).optional() }).optional(),
  show_reviews: z.boolean().optional(),
  google_place_id: z.string().max(200).optional().nullable()
}).passthrough()

// Liefert validierte Daten oder wirft einen Fehler mit status 400.
function parseOrThrow(schema, body) {
  const result = schema.safeParse(body || {})
  if (!result.success) {
    const e = new Error(result.error.errors?.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') || 'Validierung fehlgeschlagen')
    e.status = 400
    e.code = 'VALIDATION_ERROR'
    throw e
  }
  return result.data
}

module.exports = { dealCreateSchema, dealUpdateSchema, miniWebsiteUpdateSchema, parseOrThrow }
