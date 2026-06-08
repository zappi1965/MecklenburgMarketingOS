
class WorkflowRuleEngine {
  constructor(workflowService, notificationService, activityService) {
    this.workflows = workflowService
    this.notifications = notificationService
    this.activity = activityService
  }

  async evaluate(event) {
    const actions = []

    if (event.type === 'invoice_overdue') {
      actions.push(await this.notifications.enqueue({
        customer_id: event.customer_id,
        title: 'Überfällige Rechnung',
        message: event.payload?.invoice_number || 'Eine Rechnung ist überfällig.',
        payload: event.payload
      }))

      actions.push(await this.workflows.run({
        customer_id: event.customer_id,
        workflow_name: 'Mahnworkflow',
        payload: event.payload
      }))
    }

    if (event.type === 'seo_drop') {
      actions.push(await this.notifications.enqueue({
        customer_id: event.customer_id,
        title: 'SEO Rückgang erkannt',
        message: 'Der SEO Traffic ist gefallen.',
        payload: event.payload
      }))
    }

    await this.activity.log({
      customer_id: event.customer_id || null,
      action: 'workflow_rule_evaluated',
      message: event.type,
      payload: { event, action_count: actions.length }
    })

    return actions
  }
}

module.exports = WorkflowRuleEngine
