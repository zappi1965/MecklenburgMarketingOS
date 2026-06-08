
class FileService {
  constructor(supabase, activityService) {
    this.supabase = supabase
    this.activity = activityService
  }

  async createMetadata({ customer_id, name, file_type = 'general', url = '#', storage_path = null, version = 1 }) {
    const { data, error } = await this.supabase.from('customer_files').insert({
      customer_id,
      name,
      file_type,
      url,
      storage_path,
      version
    }).select()

    if (error) throw error

    await this.activity.log({
      customer_id,
      action: 'file_metadata_created',
      message: name,
      payload: { file_type, version }
    })

    return data
  }

  async bumpVersion(id) {
    const { data: current, error: readError } = await this.supabase.from('customer_files').select('*').eq('id', id).single()
    if (readError) throw readError

    const nextVersion = Number(current.version || 1) + 1
    const { data, error } = await this.supabase.from('customer_files').update({ version: nextVersion }).eq('id', id).select()
    if (error) throw error

    await this.activity.log({
      customer_id: current.customer_id,
      action: 'file_version_bumped',
      message: current.name,
      payload: { version: nextVersion }
    })

    return data
  }
}

module.exports = FileService
