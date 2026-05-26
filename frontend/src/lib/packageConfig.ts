import { customerVisibleToolsForPackage, mmosToolRegistry, type MmosTool, type PackageTier } from './toolRegistry'

// Die Tool-Labels und -Sichtbarkeit kommen jetzt komplett aus toolRegistry.
// Diese Datei stellt nur noch die Paket-Matrix fuer die Landing-Page / das
// Pricing zur Verfuegung.

function toolKeys(packageKey: string): string[] {
  return customerVisibleToolsForPackage(packageKey).map((t) => t.key)
}

function featureLabels(packageKey: string): string[] {
  return customerVisibleToolsForPackage(packageKey).map((t) => t.label)
}

export const packageMatrix = [
  {
    key: 'starter',
    name: 'Starter',
    subtitle: 'Basis fuer kleine Betriebe',
    price: 149,
    cta: 'Starter anfragen',
    tools: toolKeys('starter'),
    features: featureLabels('starter')
  },
  {
    key: 'growth',
    name: 'Growth',
    subtitle: 'QR, Reviews und Kundenbindung',
    price: 299,
    cta: 'Growth anfragen',
    tools: toolKeys('growth'),
    features: featureLabels('growth')
  },
  {
    key: 'premium',
    name: 'Premium',
    subtitle: 'Vollstaendiges Marketing OS mit AI, Automation, Billing und Forecasting',
    price: 499,
    cta: 'Premium anfragen',
    tools: toolKeys('premium'),
    features: featureLabels('premium')
  }
]

// Convenience: alle Tools einer Stufe (auch admin-only) fuer die Paket-Matrix
// im Admin-Bereich, falls dort die volle Tool-Liste gezeigt werden soll.
export function allToolsForPackage(packageKey: PackageTier | string): MmosTool[] {
  return mmosToolRegistry.filter((t) => {
    const order: Record<string, number> = { starter: 1, growth: 2, premium: 3 }
    return (order[packageKey] || 1) >= (order[t.packageMin] || 1)
  })
}
