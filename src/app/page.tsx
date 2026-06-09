import Link from "next/link";
import { TOOLS, formatPrice } from "@/lib/tools";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-12 text-center">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Enterprise Marketing SaaS · DSGVO-konform · EU-Hosting
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          MecklenburgMarketingOS
        </h1>
        <p className="max-w-2xl text-balance text-muted-foreground">
          Die modulare Marketing-Plattform für lokale Stores. Aktiviere nur die
          Tools, die du brauchst – Loyalty, Reviews, Newsletter, Rückholaktionen
          und mehr. Mandantenfähig und sicher ab Tag&nbsp;1.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Kostenlos starten
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Login
          </Link>
        </div>
      </section>

      {/* Tool grid */}
      <section className="py-8">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
          Alle Tools, ein System
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <div key={tool.key} className="rounded-lg border p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{tool.name}</h3>
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatPrice(tool.priceCents)}/Mon.
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MecklenburgMarketingOS
      </footer>
    </main>
  );
}
