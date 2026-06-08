
const fs = require('fs/promises')
const path = require('path')
const { spawn } = require('child_process')

class PdfService {
  constructor(supabase) {
    this.supabase = supabase
  }

  renderPlaceholders(templateText, values) {
    let output = String(templateText || '')
    for (const [key, value] of Object.entries(values || {})) {
      output = output.replaceAll(`{{${key}}}`, String(value ?? ''))
    }
    return output
  }

  async convertWithLibreOffice(inputPath, outDir) {
    return new Promise((resolve, reject) => {
      const proc = spawn('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', outDir, inputPath])
      let stderr = ''
      proc.stderr.on('data', d => stderr += d.toString())
      proc.on('close', code => {
        if (code !== 0) return reject(new Error(stderr || 'LibreOffice conversion failed'))
        resolve(true)
      })
    })
  }

  async generateTextPdfPlaceholder({ customer_id, filename, content }) {
    const bucket = 'documents'
    const storagePath = `${customer_id}/generated/${Date.now()}_${filename.replace(/[^\w.-]/g,'_')}.txt`
    const { error } = await this.supabase.storage.from(bucket).upload(storagePath, Buffer.from(content), {
      contentType: 'text/plain',
      upsert: true
    })
    if (error) throw error
    const { data } = await this.supabase.storage.from(bucket).createSignedUrl(storagePath, 3600)
    return { bucket, storage_path: storagePath, signed_url: data.signedUrl }
  }
}

module.exports = PdfService
