import { getReferralLanding } from "@/actions/referral";
import { ReferralClaim } from "@/components/referral/referral-claim";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ReferPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await getReferralLanding(code);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      {result.ok ? (
        <ReferralClaim code={code} landing={result.data} />
      ) : (
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Nicht verfügbar</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
