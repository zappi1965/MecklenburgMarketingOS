import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        Enterprise Marketing SaaS
      </span>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        MecklenburgMarketingOS
      </h1>
      <p className="text-balance text-muted-foreground">
        Die Tool-Plattform für lokale Stores. Loyalty &amp; QR-Kampagnen,
        Reviews und Billing — modular aktivierbar, DSGVO-konform, mandantenfähig
        ab Tag&nbsp;1.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Zum Login
      </Link>
    </main>
  );
}
