import { getAvailability } from "@/actions/booking";
import { BookingClient } from "@/components/booking/booking-client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getAvailability(slug);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      {result.ok ? (
        <BookingClient availability={result.data} />
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
