export const ADMIN_SELECTED_CUSTOMER_ID_KEY = 'mmos_admin_selected_customer_id'
export const ADMIN_SELECTED_CUSTOMER_EVENT = 'mmos:admin-customer-selected'

export function getAdminSelectedCustomerId() {
  if (typeof window === 'undefined') return ''
  try { return localStorage.getItem(ADMIN_SELECTED_CUSTOMER_ID_KEY) || '' } catch { return '' }
}

export function setAdminSelectedCustomerId(customer_id: string) {
  if (typeof window === 'undefined') return
  try {
    if (customer_id) localStorage.setItem(ADMIN_SELECTED_CUSTOMER_ID_KEY, customer_id)
    else localStorage.removeItem(ADMIN_SELECTED_CUSTOMER_ID_KEY)
    window.dispatchEvent(new CustomEvent(ADMIN_SELECTED_CUSTOMER_EVENT, { detail: { customer_id } }))
  } catch {}
}

export function onAdminCustomerSelected(handler: (customer_id: string) => void) {
  if (typeof window === 'undefined') return () => {}
  const fn = (event: Event) => handler((event as CustomEvent).detail?.customer_id || getAdminSelectedCustomerId())
  window.addEventListener(ADMIN_SELECTED_CUSTOMER_EVENT, fn as EventListener)
  window.addEventListener('storage', fn as EventListener)
  return () => {
    window.removeEventListener(ADMIN_SELECTED_CUSTOMER_EVENT, fn as EventListener)
    window.removeEventListener('storage', fn as EventListener)
  }
}
