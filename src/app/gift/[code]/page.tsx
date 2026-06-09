import { getGiftCardBalance } from "@/actions/giftcard";
import { formatPrice } from "@/lib/tools";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  redeemed: "Vollständig eingelöst",
  cancelled: "Storniert",
};

export default async function GiftBalancePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await getGiftCardBalance(code);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        {result.ok ? (
          <>
            <CardHeader>
              <CardTitle>Gutschein-Guthaben</CardTitle>
              <CardDescription>
                {STATUS_LABEL[result.data.status] ?? result.data.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {formatPrice(result.data.balanceCents)}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {code}
              </p>
            </CardContent>
          </>
        ) : (
          <CardHeader>
            <CardTitle>Nicht gefunden</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        )}
      </Card>
    </main>
  );
}
