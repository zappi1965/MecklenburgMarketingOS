
import { API_BASE } from './supabase'

export function exportCsv(table: string, customerId?: string | null) {
  if (!API_BASE) {
    alert('NEXT_PUBLIC_API_BASE fehlt')
    return
  }
  const q = customerId ? `?customer_id=${customerId}` : ''
  window.open(`${API_BASE}/api/advanced/export/${table}${q}`, '_blank')
}
