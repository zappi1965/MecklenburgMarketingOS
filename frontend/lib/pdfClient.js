const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export function openInvoicePdf(invoiceId) {
  window.open(`${API}/api/pdf/invoice/${invoiceId}`, '_blank')
}

export function openReminderPdf(invoiceNumber, level = '1. Mahnung', fee = 15) {
  const params = new URLSearchParams({ level, fee: String(fee) })
  window.open(`${API}/api/pdf/reminder/${invoiceNumber}?${params.toString()}`, '_blank')
}

export async function openReportPdf(customerId, kpis) {
  const res = await fetch(`${API}/api/pdf/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: customerId, kpis })
  })

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}