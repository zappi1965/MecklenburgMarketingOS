const { randomUUID } = require('crypto')
const GotenbergService = require('./gotenbergService')
const { assertCan, requestUser, isAdmin } = require('./permissionService')
const { getOrCreateIdempotency, storeIdempotencyResponse } = require('./idempotencyService')

function safeFilename(value = 'document') {
  return String(value || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9äöüß_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'document'
}

function documentTypeResource(type) {
  const value = String(type || '').toLowerCase()
  if (value.includes('offer') || value.includes('angebot')) return 'generated_offer'
  if (value.includes('contract') || value.includes('vertrag')) return 'generated_contract'
  if (value.includes('report')) return 'monthly_report'
  return 'output_document'
}

function nowIso() { return new Date().toISOString() }

async function createSignedUrl(supabase, bucket, storage_path, ttl = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storage_path, ttl)
  if (error) throw error
  return data?.signedUrl || null
}

async function uploadPdf(supabase, { customer_id, pdf, filename, bucket }) {
  const storage_path = `${customer_id}/documents/${new Date().toISOString().slice(0, 10)}/${Date.now()}_${safeFilename(filename)}.pdf`
  const { error } = await supabase.storage.from(bucket).upload(storage_path, pdf, {
    contentType: 'application/pdf',
    upsert: true
  })
  if (error) throw error
  return storage_path
}

async function insertDocumentRows(supabase, { customer_id, title, document_type, bucket, storage_path, filename, size_bytes, metadata = {}, status = 'freigegeben' }) {
  const common = {
    customer_id,
    title,
    type: document_type,
    status,
    bucket,
    storage_path,
    filename,
    mime_type: 'application/pdf',
    size_bytes,
    metadata,
    created_at: nowIso(),
    updated_at: nowIso()
  }

  const { data: outputDoc, error: outputError } = await supabase
    .from('output_documents')
    .insert(common)
    .select('*')
    .maybeSingle()
  if (outputError) throw outputError

  // customer_files schema variants are tolerated; fallback retries avoid failing on optional columns.
  const filePayload = {
    customer_id,
    name: filename,
    original_name: filename,
    title,
    file_type: document_type,
    bucket,
    storage_path,
    mime_type: 'application/pdf',
    size_bytes,
    actor_name: 'System',
    metadata,
    created_at: nowIso(),
    updated_at: nowIso()
  }
  let fileResult = await supabase.from('customer_files').insert(filePayload).select('*').maybeSingle()
  if (fileResult.error) {
    const fallback = { ...filePayload }
    delete fallback.title; delete fallback.metadata; delete fallback.updated_at
    fileResult = await supabase.from('customer_files').insert(fallback).select('*').maybeSingle()
  }
  if (fileResult.error) throw fileResult.error

  return { output_document: outputDoc, customer_file: fileResult.data }
}

async function renderAndStoreDocument(supabase, req, input = {}) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const user = requestUser(req)
  const customer_id = input.customer_id || input.customerId
  const document_type = input.document_type || input.documentType || 'output_document'
  const resource = documentTypeResource(document_type)

  // Document generation is internal only. Customers may read output, but not generate.
  assertCan(user, 'generate', 'document_generation', { customer_id })
  if (!isAdmin(user)) throw new Error('Dokumentenerzeugung ist nur intern erlaubt')

  if (!customer_id) {
    const err = new Error('customer_id fehlt')
    err.status = 400
    err.code = 'CUSTOMER_ID_REQUIRED'
    throw err
  }
  if (!String(input.html || '').trim()) {
    const err = new Error('HTML fehlt')
    err.status = 400
    err.code = 'DOCUMENT_HTML_REQUIRED'
    throw err
  }

  const idempotency_key = input.idempotency_key || input.idempotencyKey || null
  if (idempotency_key) {
    const idem = await getOrCreateIdempotency(supabase, { key: idempotency_key, scope: 'document_engine_v2' })
    if (idem.hit && idem.record?.response) return { ...idem.record.response, idempotent: true }
  }

  const gotenberg = new GotenbergService(supabase)
  const title = input.title || 'MMOS Dokument'
  const filename = `${safeFilename(input.filename || title)}.pdf`
  const bucket = process.env.MMOS_DOCUMENT_BUCKET || process.env.SUPABASE_DOCUMENT_BUCKET || 'generated-pdfs'
  const pdf = await gotenberg.convertHtmlToPdf(String(input.html), filename)
  if (pdf?.dryRun) {
    const err = new Error(pdf.note || 'PDF-Rendering nicht konfiguriert')
    err.status = 503
    err.code = 'PDF_RENDERER_NOT_CONFIGURED'
    throw err
  }

  const storage_path = await uploadPdf(supabase, { customer_id, pdf, filename, bucket })
  const rows = await insertDocumentRows(supabase, {
    customer_id,
    title,
    document_type,
    bucket,
    storage_path,
    filename,
    size_bytes: pdf.length,
    status: input.status || 'freigegeben',
    metadata: { ...(input.metadata || {}), engine: 'document_engine_v2', resource }
  })
  const signed_url = await createSignedUrl(supabase, bucket, storage_path, Number(process.env.MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS || 3600))

  const response = {
    ok: true,
    document_id: rows.output_document?.id,
    customer_file_id: rows.customer_file?.id,
    customer_id,
    title,
    document_type,
    bucket,
    storage_path,
    signed_url,
    filename,
    size_bytes: pdf.length
  }

  if (idempotency_key) await storeIdempotencyResponse(supabase, { key: idempotency_key, scope: 'document_engine_v2', response })
  return response
}

async function getDocumentSignedUrl(supabase, req, id) {
  const user = requestUser(req)
  const { data, error } = await supabase.from('output_documents').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) {
    const err = new Error('Dokument nicht gefunden')
    err.status = 404
    err.code = 'DOCUMENT_NOT_FOUND'
    throw err
  }
  assertCan(user, 'download', 'output_document', { customer_id: data.customer_id })
  const signed_url = await createSignedUrl(supabase, data.bucket || 'generated-pdfs', data.storage_path, Number(process.env.MMOS_DOCUMENT_SIGNED_URL_TTL_SECONDS || 3600))
  return { ok: true, document: data, signed_url }
}

module.exports = { renderAndStoreDocument, getDocumentSignedUrl, safeFilename }
