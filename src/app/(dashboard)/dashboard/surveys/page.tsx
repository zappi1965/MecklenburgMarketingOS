import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { SurveyCreate } from "@/components/survey/survey-create";

export default async function SurveysPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "surveys:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const list = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.tenantId, tenantId), isNull(surveys.deletedAt)))
    .orderBy(desc(surveys.createdAt));

  return (
    <ToolGuard toolKey="surveys" tenantId={tenantId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Umfragen</h1>
            <p className="text-sm text-muted-foreground">
              Feedback einsammeln für {ctx.tenant.name}.
            </p>
          </div>
          {can(ctx, "surveys:manage") && <SurveyCreate />}
        </div>

        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Umfragen.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((s) => (
              <Link key={s.id} href={`/dashboard/surveys/${s.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="py-4">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.isActive ? "aktiv" : "inaktiv"} ·{" "}
                      {new Date(s.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ToolGuard>
  );
}
