import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bioLinks } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bio-link redirect: bumps the click counter, then 302-redirects to the URL. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const home = new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin);

  const rows = await db
    .select({ url: bioLinks.url, isActive: bioLinks.isActive })
    .from(bioLinks)
    .where(eq(bioLinks.id, id))
    .limit(1);
  const link = rows[0];
  if (!link || !link.isActive) {
    return NextResponse.redirect(home);
  }

  try {
    const target = new URL(link.url);
    await db
      .update(bioLinks)
      .set({ clickCount: sql`${bioLinks.clickCount} + 1` })
      .where(eq(bioLinks.id, id));
    return NextResponse.redirect(target.toString(), { status: 302 });
  } catch {
    return NextResponse.redirect(home);
  }
}
