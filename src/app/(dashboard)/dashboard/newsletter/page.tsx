import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { newsletterCampaigns, newsletterContacts } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { NewsletterAdmin } from "@/components/newsletter/newsletter-admin";

export default async function NewsletterPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "newsletter:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [contactCount, campaigns] = await Promise.all([
    db
      .select({ value: count() })
      .from(newsletterContacts)
      .where(
        and(
          eq(newsletterContacts.tenantId, tenantId),
          isNull(newsletterContacts.deletedAt),
        ),
      ),
    db
      .select()
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.tenantId, tenantId))
      .orderBy(desc(newsletterCampaigns.createdAt))
      .limit(50),
  ]);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signupUrl = `${base}/newsletter/${ctx.tenant.slug}`;

  return (
    <ToolGuard toolKey="newsletter" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Newsletter</h1>
          <p className="text-sm text-muted-foreground">
            E-Mail-Marketing für {ctx.tenant.name} · {contactCount[0]?.value ?? 0}{" "}
            Kontakte.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anmelde-Link</CardTitle>
            <CardDescription>
              Double-Opt-In-Anmeldeseite zum Teilen (z. B. als QR).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input readOnly value={signupUrl} onFocus={(e) => e.target.select()} />
          </CardContent>
        </Card>

        <NewsletterAdmin
          campaigns={campaigns.map((c) => ({
            id: c.id,
            subject: c.subject,
            status: c.status,
            recipientCount: c.recipientCount,
            sentAt: c.sentAt,
            createdAt: c.createdAt,
          }))}
          canManage={can(ctx, "newsletter:manage")}
        />
      </div>
    </ToolGuard>
  );
}
