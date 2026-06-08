
const { supabaseAdmin } = require('../config')
const ActivityService = require('../services/activityService')
const NotificationService = require('../services/notificationService')
const WorkflowService = require('../services/workflowService')
const WorkerQueue = require('../queues/workerQueue')

const activity = new ActivityService(supabaseAdmin)
const notifications = new NotificationService(supabaseAdmin, activity)
const workflows = new WorkflowService(supabaseAdmin, notifications, activity)
const queue = new WorkerQueue(supabaseAdmin, workflows)

async function processOverdueInvoices() {
  if (!supabaseAdmin) return

  const { data: overdue } = await supabaseAdmin.from('invoices').select('*').eq('status', 'Überfällig')

  for (const invoice of overdue || []) {
    await notifications.enqueue({
      customer_id: invoice.customer_id,
      title: 'Überfällige Rechnung',
      message: `${invoice.invoice_number} ist überfällig.`,
      channel: 'in_app',
      payload: invoice
    })

    await workflows.run({
      customer_id: invoice.customer_id,
      workflow_name: 'Überfällige Rechnung Notification',
      payload: invoice
    })
  }
}

async function run() {
  console.log('[MMOS Worker] Start', new Date().toISOString())
  await queue.processNext(20).catch(console.error)
  await processOverdueInvoices().catch(console.error)
  console.log('[MMOS Worker] Done', new Date().toISOString())
}

run()
setInterval(run, Number(process.env.WORKER_INTERVAL_MS || 300000))
