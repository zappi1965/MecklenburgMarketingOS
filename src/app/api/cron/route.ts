import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tenantTools } from "@/db/schema";
import { runFlowsForTenant } from "@/lib/automation/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled job (Vercel Cron). Runs automation flows for every tenant that has
 * the automation tool active. Secured with CRON_SECRET — Vercel sends it as
 * `Authorization: Bearer $CRON_SECRET` automatically when the env var is set.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const activeTenants = await db
    .selectDistinct({ tenantId: tenantTools.tenantId })
    .from(tenantTools)
    .where(
      and(
        eq(tenantTools.toolKey, "automation"),
        inArray(tenantTools.status, ["active", "trial"]),
      ),
    );

  let totalExecuted = 0;
  const results: { tenantId: string; executed: number }[] = [];
  for (const { tenantId } of activeTenants) {
    try {
      const { executed } = await runFlowsForTenant(tenantId);
      totalExecuted += executed;
      if (executed > 0) results.push({ tenantId, executed });
    } catch {
      // Never let one tenant break the whole run.
    }
  }

  return NextResponse.json({
    ok: true,
    tenants: activeTenants.length,
    executed: totalExecuted,
    results,
  });
}
