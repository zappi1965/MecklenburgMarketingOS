import { unsubscribeNewsletter } from "@/actions/newsletter";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await unsubscribeNewsletter(id);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{result.ok ? "Abgemeldet" : "Hinweis"}</CardTitle>
          <CardDescription>
            {result.ok
              ? "Du erhältst keine weiteren Newsletter mehr. Schade, dass du gehst!"
              : result.error}
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
