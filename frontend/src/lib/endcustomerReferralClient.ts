import { BROWSER_BACKEND_BASE } from './backendUrl'
import { apiRequest } from './apiRequest'
import { getCurrentSession } from './authClient'

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getCurrentSession()
  if (!session?.access_token) throw new Error('Nicht angemeldet.')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export type LoyaltyReferral = {
  id: string
  referral_code: string
  referrer_email?: string
  referred_email?: string
  status: 'pending' | 'joined' | 'credited' | 'rejected'
  referrer_points: number
  friend_points: number
  credited_at?: string | null
  created_at?: string
}

export type ReferralStats = { total: number; pending: number; credited: number; rejected: number }

export const endcustomerReferralClient = {
  async list(customerId: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; settings: any; referrals: LoyaltyReferral[]; stats: ReferralStats }>(
      `${BROWSER_BACKEND_BASE}/api/endcustomer-referrals/${encodeURIComponent(customerId)}`,
      { headers, timeoutMs: 20000 }
    )
  },

  async saveSettings(customerId: string, settings: Record<string, unknown>) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; settings: any }>(
      `${BROWSER_BACKEND_BASE}/api/endcustomer-referrals/${encodeURIComponent(customerId)}/settings`,
      { method: 'POST', headers, body: JSON.stringify(settings), timeoutMs: 20000 }
    )
  },

  async memberLink(customerId: string, memberToken: string) {
    const headers = await authHeaders()
    return apiRequest<{ ok: boolean; referral_code: string; slug?: string | null; path: string }>(
      `${BROWSER_BACKEND_BASE}/api/endcustomer-referrals/${encodeURIComponent(customerId)}/link?member_token=${encodeURIComponent(memberToken)}`,
      { headers, timeoutMs: 20000 }
    )
  }
}
