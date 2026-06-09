import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewsletterSignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      {rows[0] ? (
        <NewsletterSignup slug={slug} tenantName={rows[0].name} />
      ) : (
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Nicht gefunden</CardTitle>
            <CardDescription>Dieser Store existiert nicht.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
