
import { API } from './supabase'

export async function uploadFile(bucket: string, file: File, customer_id: string, entity = 'uploads', entity_id = '') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('customer_id', customer_id)
  fd.append('entity', entity)
  fd.append('entity_id', entity_id)
  const res = await fetch(`${API}/api/upload/${bucket}`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen')
  return data
}
