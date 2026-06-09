import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bioLinks, bioPages, tenants } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenantRows = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  const tenant = tenantRows[0];

  const pageRows = tenant
    ? await db
        .select()
        .from(bioPages)
        .where(and(eq(bioPages.tenantId, tenant.id), eq(bioPages.isActive, true)))
        .limit(1)
    : [];
  const page = pageRows[0];

  if (!tenant || !page) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
        Diese Seite ist nicht verfügbar.
      </main>
    );
  }

  const links = await db
    .select()
    .from(bioLinks)
    .where(and(eq(bioLinks.bioPageId, page.id), eq(bioLinks.isActive, true)))
    .orderBy(asc(bioLinks.position));

  return (
    <main
      className="flex min-h-screen flex-col items-center px-6 py-14"
      style={{
        background: `linear-gradient(160deg, ${page.themeColor}22, transparent)`,
      }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: page.themeColor }}
        >
          {tenant.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-4 text-xl font-bold">{page.title}</h1>
        {page.bioText && (
          <p className="mt-1 text-sm text-muted-foreground">{page.bioText}</p>
        )}

        <div className="mt-8 space-y-3">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Links.</p>
          ) : (
            links.map((l) => (
              <a
                key={l.id}
                href={`/bl/${l.id}`}
                className="block rounded-lg border bg-background px-4 py-3 text-sm font-medium shadow-sm transition-transform hover:scale-[1.02]"
                style={{ borderColor: `${page.themeColor}55` }}
              >
                {l.label}
              </a>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
