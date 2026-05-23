const legalLinks = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/cookies', label: 'Cookie-Einstellungen' },
  { href: '/agb', label: 'AGB' },
  { href: '/widerruf', label: 'Widerruf' }
]

export default function LegalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? 'siteLegalFooter compact' : 'siteLegalFooter'}>
      <nav aria-label="Rechtliche Informationen" className="siteLegalLinks">
        {legalLinks.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </nav>
      {!compact && (
        <p>
          Mecklenburg Marketing · Anbieterkennzeichnung, Datenschutz, Cookie-Hinweise und Vertragsinformationen.
        </p>
      )}
    </footer>
  )
}
