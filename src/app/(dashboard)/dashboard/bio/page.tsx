import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bioLinks, bioPages } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { BioAdmin } from "@/components/bio/bio-admin";

export default async function BioDashboardPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "bio:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const pageRows = await db
    .select()
    .from(bioPages)
    .where(eq(bioPages.tenantId, tenantId))
    .limit(1);
  const page = pageRows[0] ?? null;

  const links = page
    ? await db
        .select()
        .from(bioLinks)
        .where(eq(bioLinks.bioPageId, page.id))
        .orderBy(asc(bioLinks.position))
    : [];

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${base}/bio/${ctx.tenant.slug}`;

  return (
    <ToolGuard toolKey="bio" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link-in-Bio</h1>
          <p className="text-sm text-muted-foreground">
            Öffentliche Link-Seite für {ctx.tenant.name}.
          </p>
        </div>
        <BioAdmin
          page={
            page
              ? { title: page.title, bioText: page.bioText, themeColor: page.themeColor }
              : null
          }
          links={links.map((l) => ({
            id: l.id,
            label: l.label,
            url: l.url,
            clickCount: l.clickCount,
            isActive: l.isActive,
          }))}
          publicUrl={publicUrl}
          canManage={can(ctx, "bio:manage")}
        />
      </div>
    </ToolGuard>
  );
}
