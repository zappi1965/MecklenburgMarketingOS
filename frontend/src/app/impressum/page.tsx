export const metadata = { title: 'Impressum · Mecklenburg Marketing' }

export default function LegalPage() {
  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/">← Zur Startseite</a>
        <h1>Impressum / Anbieterkennzeichnung</h1>
        <p className="legalNotice">Bitte vor Veröffentlichung mit den echten Unternehmensdaten ersetzen und rechtlich prüfen lassen.</p>
        <h2>Angaben nach § 5 DDG</h2>
        <p><strong>Mecklenburg Marketing</strong><br/>Dominique Zapf<br/>[Straße und Hausnummer ergänzen]<br/>[PLZ Ort ergänzen]</p>
        <h2>Kontakt</h2>
        <p>E-Mail: <a href="mailto:info@mecklenburg-marketing.de">info@mecklenburg-marketing.de</a><br/>Telefon: [Telefonnummer ergänzen]</p>
        <h2>Vertreten durch</h2>
        <p>Dominique Zapf</p>
        <h2>Umsatzsteuer</h2>
        <p>Umsatzsteuer-ID bzw. Kleinunternehmerhinweis: [Angabe ergänzen, sobald festgelegt]</p>
        <h2>Verantwortlich für Inhalte</h2>
        <p>Dominique Zapf, Anschrift wie oben.</p>
        <h2>Streitbeilegung</h2>
        <p>Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, sofern gesetzlich nichts anderes gilt.</p>
      </section>
    </main>
  )
}
