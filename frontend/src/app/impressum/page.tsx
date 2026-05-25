export const metadata = { title: 'Impressum · Mecklenburg Marketing' }

export default function LegalPage() {
  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/">← Zur Startseite</a>
        <h1>Impressum / Anbieterkennzeichnung</h1>
        <p><strong>MecklenburgMarketing GbR</strong><br/>Dominique Zapf, Janne Dickmann<br/>Zum Petersberg 19b<br/>19065 Pinnow</p>
        <h2>Kontakt</h2>
        <p>E-Mail: <a href="mailto:zapf@mecklenburg-marketing.de">zapf@mecklenburgmarketing.de; dickmann@mecklenburgmarketing.de</a><br/>Telefon: 01627533619</p>
        <h2>Vertreten durch</h2>
        <p>Dominique Zapf, Janne Dickmann</p>
        <h2>Umsatzsteuer</h2>
        <p>Umsatzsteuer-ID</p>
        <h2>Verantwortlich für Inhalte</h2>
        <p>Dominique Zapf, Janne Dickmann, Anschrift wie oben.</p>
        <h2>Streitbeilegung</h2>
        <p>Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, sofern gesetzlich nichts anderes gilt.</p>
      </section>
    </main>
  )
}
