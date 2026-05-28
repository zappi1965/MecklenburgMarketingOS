import { customerVisibleToolsForPackage, mmosToolRegistry, type MmosTool, type PackageTier } from './toolRegistry'
import { customerPackageComposition, modulesForPackage } from './customerToolModules'

function toolKeys(packageKey: string): string[] {
  return customerVisibleToolsForPackage(packageKey).map((t) => t.key)
}

function featureLabels(packageKey: string): string[] {
  return modulesForPackage(packageKey).map((m) => m.shortTitle)
}

export const packageMatrix = customerPackageComposition.map((pkg) => ({
  key: pkg.key,
  name: pkg.name,
  subtitle: pkg.positioning,
  price: pkg.monthlyPrice,
  setupFee: pkg.setupFee,
  cta: `${pkg.name} anfragen`,
  tools: toolKeys(pkg.key),
  features: featureLabels(pkg.key)
}))

export function allToolsForPackage(packageKey: PackageTier | string): MmosTool[] {
  return mmosToolRegistry.filter((t) => {
    const order: Record<string, number> = { starter: 1, growth: 2, premium: 3 }
    return (order[packageKey] || 1) >= (order[t.packageMin] || 1)
  })
}
