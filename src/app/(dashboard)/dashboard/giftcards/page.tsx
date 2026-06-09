import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { giftCards } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { GiftCardAdmin } from "@/components/giftcard/giftcard-admin";

export default async function GiftCardsPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "giftcards:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const cards = await db
    .select()
    .from(giftCards)
    .where(eq(giftCards.tenantId, tenantId))
    .orderBy(desc(giftCards.createdAt))
    .limit(100);

  return (
    <ToolGuard toolKey="giftcards" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gutscheine</h1>
          <p className="text-sm text-muted-foreground">
            Wertgutscheine für {ctx.tenant.name}.
          </p>
        </div>
        <GiftCardAdmin
          cards={cards.map((c) => ({
            id: c.id,
            code: c.code,
            initialAmountCents: c.initialAmountCents,
            balanceCents: c.balanceCents,
            status: c.status,
            recipientName: c.recipientName,
            createdAt: c.createdAt,
          }))}
          canManage={can(ctx, "giftcards:manage")}
          canOperate={can(ctx, "giftcards:operate")}
        />
      </div>
    </ToolGuard>
  );
}
