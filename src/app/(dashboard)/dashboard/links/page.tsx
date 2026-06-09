import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { shortLinks } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { LinkManager } from "@/components/shortlink/link-manager";

export default async function LinksPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "links:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const links = await db
    .select()
    .from(shortLinks)
    .where(and(eq(shortLinks.tenantId, tenantId), isNull(shortLinks.deletedAt)))
    .orderBy(desc(shortLinks.createdAt))
    .limit(100);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <ToolGuard toolKey="links" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Links & UTM</h1>
          <p className="text-sm text-muted-foreground">
            Trackbare Kampagnen-Links für {ctx.tenant.name}.
          </p>
        </div>
        <LinkManager
          links={links.map((l) => ({
            id: l.id,
            code: l.code,
            destinationUrl: l.destinationUrl,
            title: l.title,
            clickCount: l.clickCount,
            isActive: l.isActive,
          }))}
          baseUrl={base}
          canManage={can(ctx, "links:manage")}
        />
      </div>
    </ToolGuard>
  );
}
