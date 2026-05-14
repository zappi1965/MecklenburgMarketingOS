
const FormData = require('form-data')

class GotenbergService {
  constructor(supabase) {
    this.url = process.env.GOTENBERG_URL
    this.enabled = Boolean(this.url)
    this.supabase = supabase
  }

  async convertOfficeToPdf(buffer, filename = 'template.docx') {
    if (!this.enabled) {
      return { dryRun: true, note: 'GOTENBERG_URL fehlt. DOCX→PDF vorbereitet, aber nicht aktiv.' }
    }

    const form = new FormData()
    form.append('files', buffer, filename)

    const res = await fetch(`${this.url.replace(/\/$/,'')}/forms/libreoffice/convert`, {
      method: 'POST',
      body: form
    })
    if (!res.ok) throw new Error(`Gotenberg Fehler: ${res.status} ${await res.text()}`)
    const arr = await res.arrayBuffer()
    return Buffer.from(arr)
  }

  async convertAndStore({ customer_id, fileBuffer, filename, file_type = 'documents' }) {
    const pdf = await this.convertOfficeToPdf(fileBuffer, filename)
    if (pdf?.dryRun) return pdf

    const bucket = file_type === 'invoices' ? 'invoices' : file_type === 'contracts' ? 'contracts' : 'generated-pdfs'
    const storage_path = `${customer_id}/generated/${Date.now()}_${filename.replace(/\.[^.]+$/, '')}.pdf`

    const { error } = await this.supabase.storage.from(bucket).upload(storage_path, pdf, {
      contentType: 'application/pdf',
      upsert: true
    })
    if (error) throw error

    const { data: signed } = await this.supabase.storage.from(bucket).createSignedUrl(storage_path, 3600)

    const { data: meta, error: metaError } = await this.supabase.from('customer_files').insert({
      customer_id,
      name: filename.replace(/\.[^.]+$/, '.pdf'),
      original_name: filename,
      file_type,
      bucket,
      storage_path,
      mime_type: 'application/pdf',
      size_bytes: pdf.length,
      actor_name: 'System',
      url: signed?.signedUrl
    }).select().single()

    if (metaError) throw metaError
    return { bucket, storage_path, signed_url: signed?.signedUrl, file: meta }
  }
}

module.exports = GotenbergService
