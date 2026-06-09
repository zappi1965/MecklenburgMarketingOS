import { getSurvey } from "@/actions/survey";
import { SurveyForm } from "@/components/survey/survey-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSurvey(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      {result.ok ? (
        <SurveyForm token={token} survey={result.data} />
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
