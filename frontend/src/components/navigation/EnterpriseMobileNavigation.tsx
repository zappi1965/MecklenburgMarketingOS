
'use client'

import { useMemo, useState } from 'react'

type NavSection = {
  key: string
  label: string
  icon?: string
  children?: string[]
  mobilePriority?: number
}

export default function EnterpriseMobileNavigation({
  sections,
  activeKey,
  onNavigate,
  title = 'MMOS'
}: {
  sections: NavSection[]
  activeKey?: string
  onNavigate?: (key: string) => void
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(activeKey || null)

  const bottomItems = useMemo(() => {
    return [...(sections || [])]
      .sort((a, b) => (a.mobilePriority || 99) - (b.mobilePriority || 99))
      .slice(0, 5)
  }, [sections])

  function go(key: string) {
    onNavigate?.(key)
    setOpen(false)
  }

  return (
    <>
      <header className="enterpriseMobileTopbar">
        <button
          className="enterpriseMobileMenuButton"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menü öffnen"
        >
          ☰
        </button>
        <strong>{title}</strong>
        <span className="enterpriseMobileStatus">●</span>
      </header>

      {open && (
        <div className="enterpriseMobileOverlay" onClick={() => setOpen(false)}>
          <aside className="enterpriseMobileDrawer" onClick={e => e.stopPropagation()}>
            <div className="enterpriseMobileDrawerHeader">
              <strong>{title}</strong>
              <button type="button" onClick={() => setOpen(false)} aria-label="Menü schließen">×</button>
            </div>

            <nav className="enterpriseMobileDrawerNav">
              {sections.map(section => (
                <div className="enterpriseMobileNavGroup" key={section.key}>
                  <button
                    type="button"
                    className={activeKey === section.key ? 'active' : ''}
                    onClick={() => {
                      if (section.children?.length) {
                        setExpanded(expanded === section.key ? null : section.key)
                      } else {
                        go(section.key)
                      }
                    }}
                  >
                    <span>{section.icon || '•'}</span>
                    <strong>{section.label}</strong>
                    {section.children?.length ? <em>{expanded === section.key ? '−' : '+'}</em> : null}
                  </button>

                  {expanded === section.key && section.children?.length ? (
                    <div className="enterpriseMobileSubnav">
                      <button type="button" onClick={() => go(section.key)}>Übersicht</button>
                      {section.children.map(child => (
                        <button type="button" key={child} onClick={() => go(`${section.key}/${child}`)}>
                          {child.replaceAll('-', ' ')}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <nav className="enterpriseMobileBottomNav">
        {bottomItems.map(item => (
          <button
            key={item.key}
            type="button"
            className={activeKey === item.key ? 'active' : ''}
            onClick={() => go(item.key)}
          >
            <span>{item.icon || '•'}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </>
  )
}
