import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { PrivacyTools } from "@/components/shared/privacy-tools";

export default async function PrivacyPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "dsar:export")) redirect("/dashboard/settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Datenschutz</h1>
        <p className="text-sm text-muted-foreground">
          DSGVO-Werkzeuge für {ctx.tenant.name}.
        </p>
      </div>
      <PrivacyTools isSuperadmin={ctx.isSuperadmin} />
    </div>
  );
}
