
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


  async convertHtmlToPdf(html, filename = 'document.pdf') {
    if (!this.enabled) {
      return { dryRun: true, note: 'GOTENBERG_URL fehlt. HTML→PDF vorbereitet, aber nicht aktiv.' }
    }
    if (!html || !String(html).trim()) throw new Error('HTML-Inhalt für PDF-Erzeugung fehlt')

    const NativeFormData = globalThis.FormData
    const NativeBlob = globalThis.Blob
    const form = NativeFormData && NativeBlob ? new NativeFormData() : new FormData()
    if (NativeFormData && NativeBlob) {
      form.append('files', new NativeBlob([String(html)], { type: 'text/html; charset=utf-8' }), 'index.html')
    } else {
      form.append('files', Buffer.from(String(html), 'utf8'), {
        filename: 'index.html',
        contentType: 'text/html; charset=utf-8'
      })
    }
    form.append('paperWidth', '8.27')
    form.append('paperHeight', '11.69')
    form.append('marginTop', '0.35')
    form.append('marginBottom', '0.35')
    form.append('marginLeft', '0.35')
    form.append('marginRight', '0.35')
    form.append('printBackground', 'true')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Number(process.env.GOTENBERG_TIMEOUT_MS || 30000))
    let res
    try {
      const init = {
        method: 'POST',
        body: form,
        signal: controller.signal
      }
      if (typeof form.getHeaders === 'function') init.headers = form.getHeaders()
      res = await fetch(`${this.url.replace(/\/$/,'')}/forms/chromium/convert/html`, init)
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw new Error(`Gotenberg HTML→PDF Fehler: ${res.status} ${await res.text()}`)
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
