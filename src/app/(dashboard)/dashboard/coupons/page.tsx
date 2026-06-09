import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { CouponAdmin } from "@/components/coupon/coupon-admin";

export default async function CouponsPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "coupons:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.tenantId, tenantId))
    .orderBy(desc(coupons.createdAt))
    .limit(200);

  return (
    <ToolGuard toolKey="coupons" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Rabattcodes für {ctx.tenant.name}.
          </p>
        </div>
        <CouponAdmin
          coupons={rows.map((c) => ({
            id: c.id,
            code: c.code,
            description: c.description,
            discountType: c.discountType,
            discountValue: c.discountValue,
            maxRedemptions: c.maxRedemptions,
            redemptionCount: c.redemptionCount,
            isActive: c.isActive,
          }))}
          canManage={can(ctx, "coupons:manage")}
          canOperate={can(ctx, "coupons:operate")}
        />
      </div>
    </ToolGuard>
  );
}
