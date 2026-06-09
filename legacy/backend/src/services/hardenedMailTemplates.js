
function ticketReplyTemplate({ customerName, ticketTitle, message }) {
  return {
    subject: `Antwort auf dein Ticket: ${ticketTitle}`,
    html: `
      <h2>Dein Ticket wurde beantwortet</h2>
      <p>Hallo ${customerName || ''},</p>
      <p>${message}</p>
      <p>Viele Grüße<br/>MecklenburgMarketingOS</p>
    `
  }
}

function invoiceTemplate({ customerName, invoiceNumber, amount }) {
  return {
    subject: `Neue Rechnung ${invoiceNumber}`,
    html: `
      <h2>Neue Rechnung</h2>
      <p>Hallo ${customerName || ''},</p>
      <p>für dich wurde die Rechnung <b>${invoiceNumber}</b> über <b>${amount}</b> erstellt.</p>
    `
  }
}

function reviewInternalTemplate({ customerName, rating, feedback }) {
  return {
    subject: `Internes Feedback (${rating} Sterne) - ${customerName}`,
    html: `
      <h2>Internes Review Feedback</h2>
      <p><b>Kunde:</b> ${customerName}</p>
      <p><b>Bewertung:</b> ${rating} Sterne</p>
      <p>${feedback || ''}</p>
    `
  }
}

module.exports = {
  ticketReplyTemplate,
  invoiceTemplate,
  reviewInternalTemplate
}
