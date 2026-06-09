import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { socialPosts } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { SocialPlanner } from "@/components/social/social-planner";

export default async function SocialPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "social:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const posts = await db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.tenantId, tenantId))
    .orderBy(desc(socialPosts.createdAt))
    .limit(100);

  return (
    <ToolGuard toolKey="social" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social-Planer</h1>
          <p className="text-sm text-muted-foreground">
            Redaktionskalender für {ctx.tenant.name}.
          </p>
        </div>
        <SocialPlanner
          posts={posts.map((p) => ({
            id: p.id,
            content: p.content,
            channels: (p.channels as string[]) ?? [],
            status: p.status,
            scheduledAt: p.scheduledAt,
            publishedAt: p.publishedAt,
          }))}
          canManage={can(ctx, "social:manage")}
        />
      </div>
    </ToolGuard>
  );
}
