import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenantTools } from "@/db/schema";
import { getTool } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Billing guard. Renders children only when the tenant has the tool active or
 * in trial; otherwise shows an activation prompt. RLS enforces the same gate at
 * the data layer — this is the UX surface.
 */
export async function ToolGuard({
  toolKey,
  tenantId,
  children,
}: {
  toolKey: string;
  tenantId: string;
  children: React.ReactNode;
}) {
  const rows = await db
    .select({ status: tenantTools.status })
    .from(tenantTools)
    .where(
      and(eq(tenantTools.tenantId, tenantId), eq(tenantTools.toolKey, toolKey)),
    )
    .limit(1);
  const status = rows[0]?.status;
  const active = status === "active" || status === "trial";

  if (active) return <>{children}</>;

  const tool = getTool(toolKey);
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{tool?.name ?? "Tool"} nicht aktiv</CardTitle>
        <CardDescription>
          Dieses Tool ist für deinen Store nicht aktiviert. Aktiviere es, um
          loszulegen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/dashboard/billing/checkout">
          <Button>Jetzt aktivieren</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
