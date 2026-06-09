import { getInvitation } from "@/actions/reviews";
import { ReviewForm } from "@/components/reviews/review-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvitation(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      {result.ok ? (
        <ReviewForm token={token} />
      ) : (
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Link ungültig</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
