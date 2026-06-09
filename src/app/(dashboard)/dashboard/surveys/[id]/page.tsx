import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { surveyAnswers, surveyQuestions, surveys } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuestionBuilder } from "@/components/survey/question-builder";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "surveys:read")) redirect("/dashboard");

  const surveyRows = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, id), eq(surveys.tenantId, ctx.tenant.id)))
    .limit(1);
  const survey = surveyRows[0];
  if (!survey || survey.deletedAt) notFound();

  const [questions, answers] = await Promise.all([
    db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, survey.id))
      .orderBy(asc(surveyQuestions.position)),
    db
      .select()
      .from(surveyAnswers)
      .where(eq(surveyAnswers.tenantId, ctx.tenant.id)),
  ]);

  const answersByQuestion = new Map<string, typeof answers>();
  for (const a of answers) {
    const arr = answersByQuestion.get(a.questionId) ?? [];
    arr.push(a);
    answersByQuestion.set(a.questionId, arr);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${base}/survey/${survey.token}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/surveys"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Umfragen
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{survey.title}</h1>
        {survey.description && (
          <p className="text-sm text-muted-foreground">{survey.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teilen-Link</CardTitle>
          <CardDescription>Als QR oder Link verteilen.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
        </CardContent>
      </Card>

      {can(ctx, "surveys:manage") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fragen</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionBuilder
              surveyId={survey.id}
              isActive={survey.isActive}
              questions={questions.map((q) => ({
                id: q.id,
                label: q.label,
                type: q.type,
                options: (q.options as string[] | null) ?? null,
                required: q.required,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auswertung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Fragen.</p>
          )}
          {questions.map((q) => {
            const qa = answersByQuestion.get(q.id) ?? [];
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-sm font-medium">{q.label}</p>
                {q.type === "rating" ? (
                  <p className="text-sm text-muted-foreground">
                    Ø{" "}
                    {qa.length
                      ? (
                          qa.reduce((s, a) => s + (a.answerNumber ?? 0), 0) /
                          qa.length
                        ).toFixed(1)
                      : "–"}{" "}
                    ★ · {qa.length} Antworten
                  </p>
                ) : q.type === "choice" ? (
                  <div className="text-sm text-muted-foreground">
                    {Object.entries(
                      qa.reduce<Record<string, number>>((acc, a) => {
                        const k = a.answerText ?? "—";
                        acc[k] = (acc[k] ?? 0) + 1;
                        return acc;
                      }, {}),
                    ).map(([opt, n]) => (
                      <div key={opt} className="flex justify-between">
                        <span>{opt}</span>
                        <span>{n}</span>
                      </div>
                    ))}
                    {qa.length === 0 && "Keine Antworten"}
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {qa.slice(0, 20).map((a) => (
                      <li key={a.id} className="border-l-2 pl-2">
                        {a.answerText}
                      </li>
                    ))}
                    {qa.length === 0 && <li>Keine Antworten</li>}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
