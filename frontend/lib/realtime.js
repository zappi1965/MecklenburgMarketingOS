import { supabase } from './supabaseClient'

export function subscribeToTickets(callback){
  return supabase
    .channel('tickets-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      payload => callback(payload)
    )
    .subscribe()
}