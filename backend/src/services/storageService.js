
const BUCKETS = {
  invoices: 'invoices',
  contracts: 'contracts',
  reports: 'reports',
  media: 'media',
  documents: 'documents'
}

function safeFileName(name = 'file') {
  return String(name)
    .replace(/[^\w.\-äöüÄÖÜß ]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 140)
}

class StorageService {
  constructor(supabase) {
    this.supabase = supabase
  }

  bucket(fileType = 'documents') {
    return BUCKETS[fileType] || 'documents'
  }

  folderFor(fileType = 'documents') {
    if (fileType === 'invoices') return 'rechnungen'
    if (fileType === 'contracts') return 'vertraege'
    if (fileType === 'reports') return 'reports'
    if (fileType === 'media') return 'media'
    return 'dokumente'
  }

  async upload({ customer_id, file_type = 'documents', ref_table = null, ref_id = null, file }) {
    if (!customer_id) throw new Error('customer_id fehlt')
    if (!file) throw new Error('Datei fehlt')

    const bucket = this.bucket(file_type)
    const folder = this.folderFor(file_type)
    const date = new Date().toISOString().slice(0, 10)
    const cleanName = safeFileName(file.originalname)
    const storage_path = `${customer_id}/${folder}/${date}/${Date.now()}_${cleanName}`

    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(storage_path, file.buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: signed, error: signedError } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(storage_path, 60 * 60)

    if (signedError) throw signedError

    const { data: previous } = await this.supabase
      .from('file_versions')
      .select('version')
      .eq('customer_id', customer_id)
      .eq('original_name', file.originalname)
      .order('version', { ascending: false })
      .limit(1)

    const version = previous?.[0]?.version ? Number(previous[0].version) + 1 : 1

    const metadata = {
      customer_id,
      name: file.originalname,
      original_name: file.originalname,
      file_type,
      bucket,
      storage_path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      ref_table,
      ref_id,
      version,
      url: signed.signedUrl
    }

    const { data, error } = await this.supabase
      .from('customer_files')
      .insert(metadata)
      .select()
      .single()

    if (error) throw error

    await this.supabase.from('file_versions').insert({
      customer_id,
      file_id: data.id,
      original_name: file.originalname,
      name: file.originalname,
      bucket,
      storage_path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      version,
      ref_table,
      ref_id,
      signed_url: signed.signedUrl
    })

    return data
  }

  async list(customer_id) {
    const { data, error } = await this.supabase
      .from('customer_files')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async versions(file_id) {
    const { data, error } = await this.supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', file_id)
      .order('version', { ascending: false })

    if (error) throw error
    return data || []
  }

  async signedUrl({ bucket, storage_path, expires_in = 3600 }) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(storage_path, Number(expires_in) || 3600)

    if (error) throw error
    return data
  }
}

module.exports = StorageService
