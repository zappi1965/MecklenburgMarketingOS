import { customerPackageComposition, customerToolModules, modulesForPackage, singleModuleValue } from '@/lib/customerToolModules'

export const metadata = { title: 'Kundentools · MMOS Admin' }

const eur = (value: number) => new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(value)

export default function AdminToolsPage() {
  return (
    <main className="adminPage">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">V44 Functional Fullbuild</p>
          <h1>Kundentools, Paketlogik & Add-ons</h1>
          <p>
            Zentrale Uebersicht fuer alle verkaufbaren und jetzt funktional angebundenen Kundentool-Module.
          </p>
        </div>
        <a className="btn secondary" href="/tools" target="_blank">Oeffentliche Uebersicht</a>
      </header>

      <section className="adminCardsGrid">
        {customerPackageComposition.map((pkg) => (
          <article className="adminCard" key={pkg.key}>
            <h2>{pkg.name}</h2>
            <div className="adminMetric">{eur(pkg.monthlyPrice)} / Monat</div>
            <p>{pkg.positioning}</p>
            <div className="muted">Einrichtung: {eur(pkg.setupFee)}</div>
            <div className="muted">Einzelwert: {eur(singleModuleValue(pkg.key))} / Monat</div>
            <ul>
              {modulesForPackage(pkg.key).map((module) => <li key={module.key}>{module.shortTitle}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="adminCard">
        <h2>Verkaufbare Einzelmodule</h2>
        <div className="adminTableWrap">
          <table className="adminTable adminDesktopTable">
            <thead>
              <tr>
                <th>Modul</th>
                <th>Kategorie</th>
                <th>Ab Paket</th>
                <th>Einzelpreis</th>
                <th>Setup</th>
                <th>Tool</th>
              </tr>
            </thead>
            <tbody>
              {customerToolModules.map((tool) => (
                <tr key={tool.key}>
                  <td><strong>{tool.shortTitle}</strong><br/><span>{tool.customerValue}</span></td>
                  <td>{tool.category}</td>
                  <td>{tool.packageMin}</td>
                  <td>{eur(tool.singlePrice)}</td>
                  <td>{tool.setupFee ? eur(tool.setupFee) : 'inkl.'}</td>
                  <td><a href={tool.adminRoute || tool.route}>oeffnen</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adminMobileCardList">
          {customerToolModules.map((tool) => (
            <article className="adminMobileDataCard" key={`mobile-${tool.key}`}>
              <div><span>Modul</span><strong>{tool.shortTitle}</strong></div>
              <div><span>Kategorie</span><strong>{tool.category}</strong></div>
              <div><span>Preis</span><strong>{eur(tool.singlePrice)}</strong></div>
              <p>{tool.customerValue}</p>
              <small>Ab Paket: {tool.packageMin} · Setup: {tool.setupFee ? eur(tool.setupFee) : 'inkl.'}</small>
              <a className="adminBtn small mobileWideBtn" href={tool.adminRoute || tool.route}>Öffnen</a>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
