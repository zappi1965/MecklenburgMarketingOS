
import { hasSupabase, supabase } from './supabase'

export function subscribeCoreTables(onChange: () => void, customerId?: string | null) {
  if (!hasSupabase || !supabase) return () => {}

  const tables = [
    'customers',
    'invoices',
    'tickets',
    'seo_snapshots',
    'appointments',
    'offers',
    'recurring_invoices',
    'payments',
    'notifications',
    'automations',
    'integrations',
    'package_requests',
    'customer_tool_access',
    'contracts',
    'reports',
    'activity_logs',
    'workflow_runs',
    'customer_files',
    'notification_queue',
    'worker_jobs'
  ]

  const channel = supabase.channel(`mmos-core-realtime-${customerId || 'admin'}`)

  tables.forEach((table) => {
    const filter = customerId && !['customers', 'automations'].includes(table)
      ? `customer_id=eq.${customerId}`
      : undefined

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
      onChange
    )
  })

  channel.subscribe()
  return () => supabase.removeChannel(channel)
}
