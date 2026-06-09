import Link from "next/link";
import { redirect } from "next/navigation";
import { and, avg, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reviews, reviewSources } from "@/db/schema";
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
import { ReviewAdmin } from "@/components/reviews/review-admin";
import { RatingStars } from "@/components/reviews/rating-stars";

export default async function ReviewsPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "reviews:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [list, stats, sources] = await Promise.all([
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.tenantId, tenantId), isNull(reviews.deletedAt)))
      .orderBy(desc(reviews.createdAt))
      .limit(100),
    db
      .select({ total: count(), average: avg(reviews.rating) })
      .from(reviews)
      .where(and(eq(reviews.tenantId, tenantId), isNull(reviews.deletedAt))),
    db
      .select()
      .from(reviewSources)
      .where(
        and(
          eq(reviewSources.tenantId, tenantId),
          eq(reviewSources.type, "google"),
        ),
      )
      .limit(1),
  ]);

  const total = stats[0]?.total ?? 0;
  const average = stats[0]?.average ? Number(stats[0].average).toFixed(1) : "–";
  const source = sources[0]
    ? {
        label: sources[0].label,
        externalUrl: sources[0].externalUrl,
        redirectThreshold: sources[0].redirectThreshold,
      }
    : null;

  return (
    <ToolGuard toolKey="reviews" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Bewertungen &amp; Reputation von {ctx.tenant.name}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Bewertungen</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Durchschnitt</CardDescription>
              <CardTitle className="text-3xl">{average} ★</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {can(ctx, "reviews:manage") && <ReviewAdmin source={source} />}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Letzte Bewertungen</h2>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Bewertungen.
            </p>
          ) : (
            list.map((r) => (
              <Link key={r.id} href={`/dashboard/reviews/${r.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <RatingStars rating={r.rating} />
                      <p className="truncate text-sm">
                        {r.comment ?? <span className="text-muted-foreground">— ohne Kommentar —</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.authorName ?? "Anonym"} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    {r.response ? (
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                        beantwortet
                      </span>
                    ) : (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        offen
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </ToolGuard>
  );
}
