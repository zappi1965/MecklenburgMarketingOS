import { getCurrentUserProfile } from './authClient'
import { storeClient } from './storeClient'

export type CustomerOption = {
  id: string
  name?: string | null
  company?: string | null
  company_name?: string | null
  email?: string | null
}

export function customerOptionLabel(c: CustomerOption) {
  return c.name || c.company || c.company_name || c.email || c.id
}

export async function resolveCustomerScope(preferredCustomerId?: string | null) {
  const profile: any = await getCurrentUserProfile()
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin'
  if (!isAdmin) {
    return {
      profile,
      isAdmin: false,
      customers: [] as CustomerOption[],
      customerId: profile?.customer_id || null
    }
  }

  const res = await storeClient.list<CustomerOption>('customers', { limit: 500, order_by: 'name', order_dir: 'asc' }).catch(() => ({ data: [] as CustomerOption[] }))
  const customers = res.data || []
  const customerId = preferredCustomerId || profile?.customer_id || customers[0]?.id || null
  return { profile, isAdmin, customers, customerId }
}
