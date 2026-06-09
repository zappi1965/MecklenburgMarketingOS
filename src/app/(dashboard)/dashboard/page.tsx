import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Übersicht</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.tenant.name} · Rolle: {ctx.tenant.role}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loyalty &amp; QR</CardTitle>
            <CardDescription>Stempel, Punkte, Rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/loyalty">
              <Button variant="outline" size="sm">
                Öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviews</CardTitle>
            <CardDescription>Bewertungen &amp; Reputation</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reviews">
              <Button variant="outline" size="sm">
                Öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>Pakete &amp; Rechnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm">
                Öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
