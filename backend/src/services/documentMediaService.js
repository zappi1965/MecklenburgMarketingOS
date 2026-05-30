const path = require('path')

function nowIso() { return new Date().toISOString() }

function safeFilename(value = 'document') {
  const base = String(value || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9äöüß_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'document'
  return `${base}.pdf`
}

function safePart(value = 'document') {
  return String(value || 'document')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'document'
}

function publicBase(req) {
  return String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || req?.get?.('origin') || '').replace(/\/$/, '')
}

function isMissingColumnError(error, columnNames = []) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  const code = String(error?.code || '').toUpperCase()
  if (code === 'PGRST204') return columnNames.some((c) => msg.includes(String(c).toLowerCase())) || columnNames.length === 0
  if (!msg.includes('column') && !msg.includes('schema cache') && !msg.includes('could not find')) return false
  return columnNames.length === 0 || columnNames.some((c) => msg.includes(String(c).toLowerCase()))
}

function isMissingTableError(error) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return msg.includes('relation') || msg.includes('does not exist') || msg.includes('could not find the table')
}

function removeMentionedColumns(payload, error) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  const next = { ...payload }
  for (const key of Object.keys(payload)) {
    if (msg.includes(`'${key.toLowerCase()}'`) || msg.includes(`"${key.toLowerCase()}"`) || msg.includes(key.toLowerCase())) {
      delete next[key]
    }
  }
  return next
}

class DocumentMediaService {
  constructor(supabase) {
    this.supabase = supabase
    this.bucket = process.env.MMOS_DOCUMENT_BUCKET || process.env.SUPABASE_DOCUMENT_BUCKET || 'generated-pdfs'
    this.signedUrlTtlSeconds = Number(process.env.MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS || 60 * 60)
  }

  assertReady() {
    if (!this.supabase) {
      const err = new Error('Supabase Service Role ist nicht konfiguriert.')
      err.status = 500
      err.code = 'SUPABASE_UNCONFIGURED'
      throw err
    }
  }

  async userHasCustomerAccess(userId, customerId) {
    if (!userId || !customerId) return false
    try {
      const { data } = await this.supabase
        .from('customer_users')
        .select('id,status')
        .eq('auth_user_id', userId)
        .eq('customer_id', String(customerId))
        .eq('status', 'active')
        .maybeSingle()
      return Boolean(data)
    } catch (_) {
      return false
    }
  }

  async assertCustomerAccess({ user, userRole, customerId }) {
    if (!customerId) {
      const err = new Error('customer_id fehlt.')
      err.status = 400
      err.code = 'CUSTOMER_ID_REQUIRED'
      throw err
    }
    if (userRole === 'admin') return true
    const ok = await this.userHasCustomerAccess(user?.id, customerId)
    if (!ok) {
      const err = new Error('Kein Zugriff auf diesen Kundenbereich.')
      err.status = 403
      err.code = 'FORBIDDEN'
      throw err
    }
    return true
  }

  async assertAdmin(userRole) {
    if (userRole === 'admin') return true
    const err = new Error('Nur interne Admin-Zugänge dürfen Dokumente erzeugen oder verknüpfen.')
    err.status = 403
    err.code = 'ADMIN_ONLY'
    throw err
  }

  storagePath({ customer_id, filename, document_type = 'document' }) {
    const date = new Date()
    const yyyy = String(date.getFullYear())
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const stamp = `${date.getTime()}`
    return `${customer_id}/${yyyy}/${mm}/${safePart(document_type)}/${stamp}_${safeFilename(filename)}`
  }

  async signedUrl(bucket, storage_path, ttl = this.signedUrlTtlSeconds) {
    if (!bucket || !storage_path) return ''
    try {
      const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(storage_path, ttl)
      if (error) return ''
      return data?.signedUrl || ''
    } catch (_) { return '' }
  }

  async uploadPdf({ customer_id, pdfBuffer, filename, document_type = 'document' }) {
    this.assertReady()
    if (!Buffer.isBuffer(pdfBuffer) || !pdfBuffer.length) {
      const err = new Error('PDF-Buffer fehlt oder ist leer.')
      err.status = 400
      err.code = 'PDF_BUFFER_REQUIRED'
      throw err
    }
    const bucket = this.bucket
    const storage_path = this.storagePath({ customer_id, filename, document_type })
    const { error } = await this.supabase.storage.from(bucket).upload(storage_path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })
    if (error) throw error
    const signed_url = await this.signedUrl(bucket, storage_path)
    return { bucket, storage_path, signed_url, size_bytes: pdfBuffer.length }
  }

  async safeInsert(table, candidates) {
    const warnings = []
    for (const original of candidates) {
      let payload = { ...original }
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const { data, error } = await this.supabase.from(table).insert(payload).select('*').maybeSingle()
          if (!error) return { data, warnings }
          if (isMissingTableError(error)) return { data: null, warnings: [...warnings, `${table}: Tabelle fehlt`] }
          if (isMissingColumnError(error)) {
            warnings.push(`${table}: Spalte fehlt (${error.message})`)
            const next = removeMentionedColumns(payload, error)
            if (Object.keys(next).length === Object.keys(payload).length) break
            payload = next
            continue
          }
          warnings.push(`${table}: ${error.message || String(error)}`)
          break
        } catch (error) {
          warnings.push(`${table}: ${error?.message || String(error)}`)
          break
        }
      }
    }
    return { data: null, warnings }
  }

  async createMetadata({ customer_id, title, filename, document_type, source_table, source_id, bucket, storage_path, signed_url, size_bytes, visibility = 'customer', actor_name = 'System' }) {
    const common = {
      customer_id,
      title: title || filename,
      name: filename,
      original_name: filename,
      document_type,
      type: document_type,
      file_type: document_type,
      status: visibility === 'internal' ? 'Intern' : 'Freigegeben',
      visibility,
      is_customer_visible: visibility !== 'internal',
      bucket,
      storage_path,
      mime_type: 'application/pdf',
      size_bytes,
      url: signed_url,
      file_url: signed_url,
      pdf_url: signed_url,
      source_table: source_table || null,
      source_id: source_id || null,
      actor_name,
      generated_by: actor_name,
      created_at: nowIso(),
      updated_at: nowIso()
    }

    const fileMeta = await this.safeInsert('customer_files', [
      common,
      {
        customer_id,
        name: filename,
        original_name: filename,
        file_type: document_type,
        bucket,
        storage_path,
        mime_type: 'application/pdf',
        size_bytes,
        actor_name,
        url: signed_url,
        created_at: nowIso(),
        updated_at: nowIso()
      },
      { customer_id, name: filename, url: signed_url, file_type: document_type }
    ])

    const outputMeta = await this.safeInsert('output_documents', [
      common,
      {
        customer_id,
        title: title || filename,
        type: document_type,
        status: visibility === 'internal' ? 'Intern' : 'Freigegeben',
        bucket,
        storage_path,
        url: signed_url,
        file_url: signed_url,
        created_at: nowIso(),
        updated_at: nowIso()
      },
      { customer_id, title: title || filename, url: signed_url, type: document_type }
    ])

    return {
      customer_file: fileMeta.data,
      output_document: outputMeta.data,
      warnings: [...fileMeta.warnings, ...outputMeta.warnings]
    }
  }

  async storePdf({ customer_id, pdfBuffer, filename, title, document_type, source_table, source_id, visibility, actor_name }) {
    const stored = await this.uploadPdf({ customer_id, pdfBuffer, filename, document_type })
    const meta = await this.createMetadata({
      customer_id,
      title,
      filename: safeFilename(filename),
      document_type,
      source_table,
      source_id,
      visibility,
      actor_name,
      ...stored
    })
    return { ...stored, ...meta }
  }

  async listTable(table, customer_id, limit = 100) {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('customer_id', String(customer_id))
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) return []
      return data || []
    } catch (_) { return [] }
  }

  normalizeDoc(row, source) {
    const bucket = row.bucket || row.storage_bucket || row.file_bucket || ''
    const storage_path = row.storage_path || row.path || row.file_path || ''
    return {
      id: row.id || `${source}:${storage_path || row.url || row.title || row.name}`,
      source,
      customer_id: row.customer_id,
      title: row.title || row.name || row.period_label || row.original_name || 'Dokument',
      type: row.type || row.document_type || row.file_type || source,
      status: row.status || (row.value_score != null ? `${row.value_score}/100` : 'Freigegeben'),
      created_at: row.created_at || row.generated_at || row.updated_at || null,
      updated_at: row.updated_at || null,
      bucket,
      storage_path,
      url: row.url || row.file_url || row.pdf_url || '',
      mime_type: row.mime_type || 'application/pdf',
      size_bytes: row.size_bytes || null,
      source_id: row.source_id || row.id || null
    }
  }

  async listCustomerDocuments({ customer_id, include_signed_urls = true }) {
    this.assertReady()
    const tables = [
      ['output_documents', 'Output'],
      ['customer_files', 'Datei'],
      ['monthly_reports', 'Monatsreport'],
      ['generated_offers', 'Angebot'],
      ['generated_contracts', 'Vertrag'],
      ['google_business_audits', 'Google Audit']
    ]
    const groups = await Promise.all(tables.map(async ([table, label]) => {
      const rows = await this.listTable(table, customer_id, 100)
      return rows.map((row) => this.normalizeDoc(row, label))
    }))

    const seen = new Set()
    const docs = []
    for (const doc of groups.flat()) {
      const key = `${doc.bucket}:${doc.storage_path}:${doc.url}:${doc.title}:${doc.created_at}`
      if (seen.has(key)) continue
      seen.add(key)
      if (include_signed_urls && doc.bucket && doc.storage_path) {
        doc.url = await this.signedUrl(doc.bucket, doc.storage_path)
      }
      docs.push(doc)
    }
    docs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    return docs
  }

  async resolveDownload({ customer_id, source, id }) {
    const tableMap = {
      output: 'output_documents',
      file: 'customer_files',
      report: 'monthly_reports',
      offer: 'generated_offers',
      contract: 'generated_contracts',
      audit: 'google_business_audits'
    }
    const table = tableMap[String(source || '').toLowerCase()] || 'output_documents'
    const { data, error } = await this.supabase.from(table).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) {
      const err = new Error('Dokument nicht gefunden.')
      err.status = 404
      err.code = 'DOCUMENT_NOT_FOUND'
      throw err
    }
    if (String(data.customer_id) !== String(customer_id)) {
      const err = new Error('Dokument gehört nicht zu diesem Kundenbereich.')
      err.status = 403
      err.code = 'FORBIDDEN'
      throw err
    }
    const doc = this.normalizeDoc(data, table)
    if (doc.bucket && doc.storage_path) doc.url = await this.signedUrl(doc.bucket, doc.storage_path)
    return doc
  }
}

module.exports = DocumentMediaService
