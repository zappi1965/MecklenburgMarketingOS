
const allowedTables = [
  'customers','invoices','tickets','seo_snapshots','appointments','offers',
  'recurring_invoices','payments','notifications','automations','integrations',
  'package_requests','customer_tool_access','contracts','reports','activity_logs',
  'workflow_runs','customer_files','notification_queue','worker_jobs'
]

const requiredFields = {
  customers: ['name'],
  invoices: ['invoice_number','customer_id'],
  tickets: ['title','customer_id'],
  appointments: ['client_name','customer_id','appointment_date'],
  seo_snapshots: ['customer_id'],
  offers: ['customer_id'],
  contracts: ['customer_id','title'],
  reports: ['customer_id','title'],
  customer_files: ['customer_id','name'],
  notification_queue: ['title'],
  workflow_runs: ['workflow_name']
}

function validatePayload(table, payload = {}) {
  if (!allowedTables.includes(table)) {
    const err = new Error('table not allowed')
    err.status = 400
    throw err
  }

  const missing = (requiredFields[table] || []).filter((field) => {
    const value = payload[field]
    return value === undefined || value === null || String(value).trim() === ''
  })

  if (missing.length) {
    const err = new Error(`Pflichtfelder fehlen: ${missing.join(', ')}`)
    err.status = 400
    throw err
  }
}

module.exports = { allowedTables, requiredFields, validatePayload }
