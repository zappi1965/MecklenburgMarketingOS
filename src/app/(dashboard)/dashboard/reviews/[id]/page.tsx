import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RatingStars } from "@/components/reviews/rating-stars";
import { ResponseForm } from "@/components/reviews/response-form";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "reviews:read")) redirect("/dashboard");

  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.tenantId, ctx.tenant.id)))
    .limit(1);
  const review = rows[0];
  if (!review || review.deletedAt) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/reviews"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Reviews
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <RatingStars rating={review.rating} />
            <span className="text-sm text-muted-foreground">
              {new Date(review.createdAt).toLocaleString("de-DE")}
            </span>
          </div>
          <CardTitle className="text-base">
            {review.authorName ?? "Anonym"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {review.comment ?? (
              <span className="text-muted-foreground">— ohne Kommentar —</span>
            )}
          </p>
        </CardContent>
      </Card>

      {can(ctx, "reviews:manage") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antwort</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponseForm reviewId={review.id} existing={review.response} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
