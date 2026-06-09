import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/db";
import { loyaltyMembers, qrScans, tenantTools } from "@/db/schema";
import { TOOLS, getToolRoute } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const ctx = await requireSession();

  if (!ctx.tenant) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Willkommen bei MMOS</CardTitle>
          <CardDescription>
            Du gehörst noch zu keinem Store. Lege jetzt deinen Store an, um
            loszulegen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/onboarding">
            <Button>Store einrichten</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const tenantId = ctx.tenant.id;

  // Active / trial tools for this tenant.
  const toolRows = await db
    .select({ toolKey: tenantTools.toolKey, status: tenantTools.status })
    .from(tenantTools)
    .where(eq(tenantTools.tenantId, tenantId));
  const activeKeys = new Set(
    toolRows
      .filter((t) => t.status === "active" || t.status === "trial")
      .map((t) => t.toolKey),
  );
  const activeTools = TOOLS.filter((t) => activeKeys.has(t.key));

  // Headline loyalty stats when the tool is active.
  let loyaltyStats: { scans: number; members: number } | null = null;
  if (activeKeys.has("loyalty")) {
    const [scans, members] = await Promise.all([
      db
        .select({ value: count() })
        .from(qrScans)
        .where(eq(qrScans.tenantId, tenantId)),
      db
        .select({ value: count() })
        .from(loyaltyMembers)
        .where(
          and(
            eq(loyaltyMembers.tenantId, tenantId),
            isNull(loyaltyMembers.deletedAt),
          ),
        ),
    ]);
    loyaltyStats = {
      scans: scans[0]?.value ?? 0,
      members: members[0]?.value ?? 0,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Übersicht</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.tenant.name} · Rolle: {ctx.tenant.role}
        </p>
      </div>

      {loyaltyStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>QR-Scans</CardDescription>
              <CardTitle className="text-3xl">{loyaltyStats.scans}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Loyalty-Mitglieder</CardDescription>
              <CardTitle className="text-3xl">{loyaltyStats.members}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Deine Tools</h2>
        {activeTools.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Noch keine Tools aktiv</CardTitle>
              <CardDescription>
                Aktiviere Tools, um deine Marketing-Plattform zu nutzen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/billing/checkout">
                <Button>Tools aktivieren</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTools.map((tool) => (
              <Link key={tool.key} href={getToolRoute(tool.key)}>
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <Link href="/dashboard/billing/checkout">
          <Button variant="outline" size="sm">
            Weitere Tools aktivieren
          </Button>
        </Link>
      </div>
    </div>
  );
}
