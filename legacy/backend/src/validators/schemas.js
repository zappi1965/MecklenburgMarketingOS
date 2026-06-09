
const { z } = require('zod')

const uuid = z.string().uuid()

const createInvoiceSchema = z.object({
  customer_id: uuid,
  service_type: z.string().min(1),
  amount: z.number().or(z.string().transform(Number)),
  status: z.string().optional()
})

const createTicketSchema = z.object({
  customer_id: uuid,
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['Niedrig','Mittel','Hoch']).optional()
})

const createQrCampaignSchema = z.object({
  customer_id: uuid,
  title: z.string().min(1),
  internal_email: z.string().email().optional().or(z.literal('')),
  internal_from: z.number().min(1).max(5).or(z.string().transform(Number)),
  internal_to: z.number().min(1).max(5).or(z.string().transform(Number)),
  google_from: z.number().min(1).max(5).or(z.string().transform(Number)),
  google_to: z.number().min(1).max(5).or(z.string().transform(Number)),
  google_review_url: z.string().optional()
})

function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (e) {
      const err = new Error(e.errors?.map(x => x.message).join(', ') || 'Validation fehlgeschlagen')
      err.status = 400
      next(err)
    }
  }
}

module.exports = {
  createInvoiceSchema,
  createTicketSchema,
  createQrCampaignSchema,
  validate
}
