import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/db";
import { tenantTools } from "@/db/schema";
import { DashboardNav } from "@/components/shared/dashboard-nav";
import { SignOutButton } from "@/components/shared/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth guard: redirects to /login when there is no session.
  const ctx = await requireSession();

  // Nav only surfaces tools the tenant actually has active.
  let activeTools: string[] = [];
  if (ctx.tenant) {
    const rows = await db
      .select({ toolKey: tenantTools.toolKey, status: tenantTools.status })
      .from(tenantTools)
      .where(eq(tenantTools.tenantId, ctx.tenant.id));
    activeTools = rows
      .filter((r) => r.status === "active" || r.status === "trial")
      .map((r) => r.toolKey);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <Link href="/dashboard" className="font-semibold">
          {ctx.tenant?.name ?? "MMOS"}
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {ctx.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <DashboardNav activeTools={activeTools} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
