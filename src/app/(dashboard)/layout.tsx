import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { DashboardNav } from "@/components/shared/dashboard-nav";
import { SignOutButton } from "@/components/shared/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth guard: redirects to /login when there is no session.
  const ctx = await requireSession();

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
          <DashboardNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
