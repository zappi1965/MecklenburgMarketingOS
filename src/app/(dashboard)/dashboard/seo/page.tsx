import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { seoKeywords, seoProfiles, seoRankSnapshots } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { buildLocalBusinessJsonLd, jsonLdScriptTag } from "@/lib/seo-schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { CopyBlock } from "@/components/shared/copy-block";
import { SeoProfileForm } from "@/components/seo/seo-profile-form";
import { KeywordManager } from "@/components/seo/keyword-manager";

export default async function SeoPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "seo:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [profileRows, keywords, snapshots] = await Promise.all([
    db.select().from(seoProfiles).where(eq(seoProfiles.tenantId, tenantId)).limit(1),
    db.select().from(seoKeywords).where(eq(seoKeywords.tenantId, tenantId)),
    db
      .select()
      .from(seoRankSnapshots)
      .where(eq(seoRankSnapshots.tenantId, tenantId))
      .orderBy(desc(seoRankSnapshots.checkedAt)),
  ]);

  const profile = profileRows[0] ?? null;

  // Latest + previous rank per keyword (snapshots are newest-first).
  const byKeyword = new Map<string, number[]>();
  for (const s of snapshots) {
    const arr = byKeyword.get(s.keywordId) ?? [];
    arr.push(s.position);
    byKeyword.set(s.keywordId, arr);
  }
  const keywordView = keywords.map((k) => {
    const ranks = byKeyword.get(k.id) ?? [];
    return {
      id: k.id,
      keyword: k.keyword,
      location: k.location,
      latest: ranks[0] ?? null,
      previous: ranks[1] ?? null,
    };
  });

  const jsonLd = profile
    ? jsonLdScriptTag(buildLocalBusinessJsonLd(profile))
    : null;

  return (
    <ToolGuard toolKey="seo" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO & Local</h1>
          <p className="text-sm text-muted-foreground">
            Local-SEO für {ctx.tenant.name}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unternehmensprofil (NAP)</CardTitle>
            <CardDescription>
              Konsistente Name/Adresse/Telefon-Daten — Grundlage für lokale
              Suche und das LocalBusiness-Schema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeoProfileForm profile={profile} />
          </CardContent>
        </Card>

        {jsonLd && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LocalBusiness JSON-LD</CardTitle>
              <CardDescription>
                In den <code>&lt;head&gt;</code> deiner Website einfügen für
                Rich Results bei Google.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyBlock content={jsonLd} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keyword-Rankings</CardTitle>
            <CardDescription>
              Ziel-Keywords verfolgen und Positionen protokollieren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeywordManager
              keywords={keywordView}
              canManage={can(ctx, "seo:manage")}
            />
          </CardContent>
        </Card>
      </div>
    </ToolGuard>
  );
}
