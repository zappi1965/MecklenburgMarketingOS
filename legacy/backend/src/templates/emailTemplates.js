
module.exports = {
  invoiceOverdue: ({invoiceNumber}) => ({
    subject: `Rechnung ${invoiceNumber} ist überfällig`,
    html: `<h1>Überfällige Rechnung</h1><p>Die Rechnung ${invoiceNumber} ist überfällig.</p>`
  }),
  workflowCompleted: ({workflow}) => ({
    subject: `Workflow abgeschlossen`,
    html: `<p>Workflow ${workflow} wurde erfolgreich ausgeführt.</p>`
  })
}
