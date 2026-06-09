import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { shortLinks, shortLinkClicks } from "@/db/schema";
import { hashIp } from "@/lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public short-link redirect. Resolves the code, appends UTM parameters to the
 * destination, logs the click and increments the counter, then 302-redirects.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const rows = await db
    .select()
    .from(shortLinks)
    .where(
      and(
        eq(shortLinks.code, code),
        eq(shortLinks.isActive, true),
        isNull(shortLinks.deletedAt),
      ),
    )
    .limit(1);
  const link = rows[0];
  if (!link) {
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin),
    );
  }

  // Build the destination with UTM parameters.
  let target: URL;
  try {
    target = new URL(link.destinationUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin),
    );
  }
  if (link.utmSource) target.searchParams.set("utm_source", link.utmSource);
  if (link.utmMedium) target.searchParams.set("utm_medium", link.utmMedium);
  if (link.utmCampaign)
    target.searchParams.set("utm_campaign", link.utmCampaign);

  // Log the click (best-effort) and bump the counter.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip");
  try {
    await db.insert(shortLinkClicks).values({
      tenantId: link.tenantId,
      shortLinkId: link.id,
      ipHash: hashIp(ip),
      userAgent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
    });
    await db
      .update(shortLinks)
      .set({ clickCount: sql`${shortLinks.clickCount} + 1` })
      .where(eq(shortLinks.id, link.id));
  } catch {
    // Never block the redirect on logging failure.
  }

  return NextResponse.redirect(target.toString(), { status: 302 });
}
