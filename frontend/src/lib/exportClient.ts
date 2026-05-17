
import { API_BASE } from './supabase'

export function exportCsv(table: string, customerId?: string | null) {
  const q = customerId ? `?customer_id=${customerId}` : ''
  window.open(`${API_BASE}/api/advanced/export/${table}${q}`, '_blank')
}
