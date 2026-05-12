
import { supabase } from './supabase'

export function subscribeCustomer(customerId: string, onChange: () => void) {
  const channel = supabase.channel(`customer-${customerId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `customer_id=eq.${customerId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `customer_id=eq.${customerId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'seo_traffic', filter: `customer_id=eq.${customerId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `customer_id=eq.${customerId}` }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
