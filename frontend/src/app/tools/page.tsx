import LegalFooter from '@/components/legal/LegalFooter'
import { customerPackageComposition, customerToolModules, modulesForPackage, singleModuleValue } from '@/lib/customerToolModules'

export const metadata = {
  title: 'Kundentools & Module · Mecklenburg Marketing',
  description: 'Uebersicht der MMOS Kundentools, Module, Paketlogik und Einzelpreise fuer lokale Betriebe in Mecklenburg-Vorpommern.'
}

const eur = (value: number) => new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(value)

const categoryLabel: Record<string, string> = {
  visibility: 'Gefunden werden',
  reputation: 'Vertrauen aufbauen',
  loyalty: 'Kunden binden',
  operations: 'Betrieb vereinfachen',
  communication: 'Kommunikation',
  sales: 'Verkauf & Akquise',
  reporting: 'Reporting'
}

export default function CustomerToolsPage() {
  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/">← Zur Startseite</a>
        <p className="eyebrow">MMOS Kundentools</p>
        <h1>Lokale Marketing-Module fuer kleine Betriebe in MV</h1>
        <p><a className="btn" href="/value-dashboard">V46 Value Dashboard öffnen</a> <a className="btn secondary" href="/growth-command">V47 Growth Command öffnen</a></p>
        <p>
          MMOS buendelt einzelne Funktionen nicht kleinteilig, sondern in verstaendliche
          Kundentool-Module. Die V44-Module sind mit Kunden, QR/Loyalty, Reviews, Terminen,
          Rechnungen, Tickets, Leads und SEO-Daten verbunden.
        </p>
      </section>

      <section className="legalCard">
        <h2>Funktionierende Kundentool-Module</h2>
        <div className="grid two">
          {customerToolModules.map((tool) => (
            <article className="card" id={tool.key} key={tool.key}>
              <div className="row between">
                <span className="badge">{categoryLabel[tool.category] || tool.category}</span>
                <strong>{eur(tool.singlePrice)} / Monat</strong>
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
              <p><strong>Kundennutzen:</strong> {tool.customerValue}</p>
              <h4>Enthalten</h4>
              <ul>
                {tool.includedTools.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p>
                <strong>Einrichtung:</strong> {tool.setupFee ? eur(tool.setupFee) : 'inklusive / anrechenbar'} ·{' '}
                <strong>ab Paket:</strong> {tool.packageMin}
              </p>
              <a className="btn secondary" href={tool.route}>Tool oeffnen</a>
            </article>
          ))}
        </div>
      </section>

      <section className="legalCard">
        <p className="eyebrow">Paketlogik</p>
        <h2>So setzen sich Starter, Growth und Premium zusammen</h2>
        <div className="grid three">
          {customerPackageComposition.map((pkg) => {
            const modules = modulesForPackage(pkg.key)
            return (
              <article className="card" key={pkg.key}>
                <h3>{pkg.name}</h3>
                <p><strong>{eur(pkg.monthlyPrice)} / Monat</strong></p>
                <p>{pkg.positioning}</p>
                <p>Einrichtung: {eur(pkg.setupFee)}</p>
                <p>Einzelwert Module: {eur(singleModuleValue(pkg.key))} / Monat</p>
                <ul>
                  {modules.map((module) => <li key={module.key}>{module.shortTitle}</li>)}
                </ul>
              </article>
            )
          })}
        </div>
      </section>

      <LegalFooter />
    </main>
  )
}
