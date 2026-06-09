"use client";

import { useState, useTransition } from "react";
import { submitSurvey, type PublicSurvey } from "@/actions/survey";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SurveyForm({
  token,
  survey,
}: {
  token: string;
  survey: PublicSurvey;
}) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const answers = Object.entries(values).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      const result = await submitSurvey({ token, answers });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Danke! 🙏</CardTitle>
          <CardDescription>Deine Antworten wurden gespeichert.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{survey.title}</CardTitle>
        {survey.description && (
          <CardDescription>{survey.description}</CardDescription>
        )}
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-5">
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label>
                {q.label}
                {q.required && <span className="text-destructive"> *</span>}
              </Label>

              {q.type === "rating" && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set(q.id, String(n))}
                      className="text-3xl leading-none"
                      aria-label={`${n}`}
                    >
                      <span
                        className={
                          Number(values[q.id]) >= n
                            ? "text-yellow-400"
                            : "text-muted-foreground/30"
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {q.type === "text" && (
                <textarea
                  rows={2}
                  value={values[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              )}

              {q.type === "choice" && q.options && (
                <div className="space-y-1">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        checked={values[q.id] === opt}
                        onChange={() => set(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Sende…" : "Absenden"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
