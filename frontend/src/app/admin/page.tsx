import {
  Activity,
  BarChart3,
  BrainCircuit,
  FileSearch,
  FileText,
  Shield,
  Target,
  Wrench,
  UserPlus,
  Rocket
} from 'lucide-react'

export const metadata = { title: 'Admin Tool-Zentrale · MMOS' }

const NEW_TOOLS = [
  {
    href: '/admin/production/tool-readiness',
    title: 'Tool-Reife 1–100',
    eyebrow: 'Produktionsreife',
    icon: Activity,
    text: 'Bewertet jedes verkaufbare Tool, zeigt fehlende Punkte und Live-Nachweise.'
  },
  {
    href: '/admin/production/completeness-audit',
    title: 'Completeness Audit',
    eyebrow: 'Pilot Readiness',
    icon: Activity,
    text: 'Prüft Systemvollständigkeit, Live-Blocker, Kundenportal, SumUp, PDF, Consent, Billing und Migrationen.'
  },
  {
    href: '/admin/go-live',
    title: 'Go-Live Cockpit',
    eyebrow: 'Live',
    icon: Rocket,
    text: 'Zentrale Startseite für Pilotfähigkeit, Mail-Domain, Kunden-Go-Live, Retention und Blocker.'
  },
  {
    href: '/admin/training',
    title: 'Wissenstest',
    eyebrow: 'Training',
    icon: BrainCircuit,
    text: 'Fragen zu allen MMOS-Tools, Vertrieb, Kundenlogik, Datenschutz, Security und Betrieb.'
  },
  {
    href: '/admin/sales/mini-audit-generator',
    title: 'Mini Audit Generator',
    eyebrow: 'Akquise',
    icon: FileSearch,
    text: 'Google-only Mini-Audit für Erstgespräch, Leadansprache und schnelle PDF/PPTX-Ausgabe.'
  },
  {
    href: '/admin/sales/lead-engine',
    title: 'Lead Engine',
    eyebrow: 'Akquise',
    icon: Target,
    text: 'Lead-Suche und Vorqualifizierung auf Basis öffentlicher Google-Daten.'
  },
  {
    href: '/admin/production',
    title: 'Production Readiness',
    eyebrow: 'Betrieb',
    icon: Activity,
    text: 'Monitoring, Backups, API-Kosten, Admin-Logs und technische Bereitschaft.'
  },
  {
    href: '/admin/production/security-core',
    title: 'Security Core',
    eyebrow: 'Sicherheit',
    icon: Shield,
    text: 'Tenant-Isolation, Rechteprüfung, Job Queue, Idempotency und Migration Guard.'
  },
  {
    href: '/admin/admin-profiles',
    title: 'Adminprofile',
    eyebrow: 'Interne Verwaltung',
    icon: UserPlus,
    text: 'Live-Adminzugänge anlegen, aktivieren, sperren und Startpasswörter setzen.'
  },
  {
    href: '/portal/reports',
    title: 'Kundenportal Reports',
    eyebrow: 'Portal',
    icon: FileText,
    text: 'Ansicht der freigegebenen Reports und PDFs aus Kundensicht.'
  },
  {
    href: '/media/report-center',
    title: 'Media & Reports',
    eyebrow: 'Dokumente',
    icon: FileText,
    text: 'Interner Report- und Dokumentenbereich für Dateien, Angebote, Audits und Ausgaben.'
  },
  {
    href: '/admin/tool-access-v2',
    title: 'Tool-Freigaben Pro',
    eyebrow: 'Verwaltung',
    icon: Wrench,
    text: 'Freischaltungen pro Kunde, Paket und Add-on sauber verwalten.'
  }
]

const CORE_LINKS = [
  { href: '/admin/sales', label: 'Sales-Werkzeuge' },
  { href: '/admin/tools', label: 'Pakete & Kundentools' },
  { href: '/admin/customer-intelligence', label: 'Customer Intelligence' },
  { href: '/crm/customer-health', label: 'Customer Health' },
  { href: '/admin/data-quality', label: 'Datenqualität' },
  { href: '/admin/admin-profiles', label: 'Adminprofile' },
  { href: '/admin/compliance', label: 'DSGVO-Cockpit' },
  { href: '/admin/api-keys', label: 'API-Keys' },
  { href: '/admin/demo-data', label: 'Demo-Daten' }
]

export default function AdminToolCenterPage() {
  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <p className="eyebrow">MMOS Admin</p>
          <h1>Tool-Zentrale</h1>
          <p>Alle neuen und wichtigen internen Werkzeuge sind jetzt direkt über die Seitenleiste und diese Übersicht erreichbar.</p>
        </div>
        <a className="btn" href="/admin/training">Wissenstest starten</a>
      </div>

      <section className="adminCardsGrid">
        {NEW_TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <a key={tool.href} href={tool.href} className="adminCard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row between">
                <span className="badge blue">{tool.eyebrow}</span>
                <Icon size={20} />
              </div>
              <h2>{tool.title}</h2>
              <p>{tool.text}</p>
              <span className="btn secondary">Öffnen</span>
            </a>
          )
        })}
      </section>

      <section className="adminCard">
        <div className="row between">
          <div>
            <p className="eyebrow">Schnellzugriff</p>
            <h2>Weitere zentrale Bereiche</h2>
          </div>
          <BarChart3 size={22} />
        </div>
        <div className="row gap">
          {CORE_LINKS.map((link) => (
            <a key={link.href} className="btn secondary" href={link.href}>{link.label}</a>
          ))}
        </div>
      </section>
    </div>
  )
}
