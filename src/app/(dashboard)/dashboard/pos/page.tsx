import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loyaltyMembers } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { PosClient } from "@/components/booking/pos-client";

export default async function PosPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  // POS credits loyalty points, so it requires loyalty operation rights.
  if (!can(ctx, "loyalty:operate")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const recent = await db
    .select({
      id: loyaltyMembers.id,
      displayName: loyaltyMembers.displayName,
      email: loyaltyMembers.email,
      pointsBalance: loyaltyMembers.pointsBalance,
    })
    .from(loyaltyMembers)
    .where(
      and(eq(loyaltyMembers.tenantId, tenantId), isNull(loyaltyMembers.deletedAt)),
    )
    .orderBy(desc(loyaltyMembers.createdAt))
    .limit(8);

  return (
    <ToolGuard toolKey="loyalty" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kasse (POS)</h1>
          <p className="text-sm text-muted-foreground">
            Loyalty-Punkte an der Kasse gutschreiben.
          </p>
        </div>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Punkte gutschreiben</CardTitle>
            <CardDescription>
              Mitglieds-ID eingeben oder aus der Liste wählen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PosClient
              recent={recent.map((m) => ({
                id: m.id,
                label: m.displayName ?? m.email ?? `#${m.id.slice(0, 8)}`,
                balance: m.pointsBalance,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </ToolGuard>
  );
}
