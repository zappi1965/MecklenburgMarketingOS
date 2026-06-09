"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addQuestion,
  deleteQuestion,
  setSurveyActive,
} from "@/actions/survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Question {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
}

export function QuestionBuilder({
  surveyId,
  questions,
  isActive,
}: {
  surveyId: string;
  questions: Question[];
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"rating" | "text" | "choice">("rating");

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    const optionsRaw = String(f.get("options") ?? "");
    const options = optionsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await addQuestion({
        surveyId,
        label: String(f.get("label") ?? ""),
        type,
        options: type === "choice" ? options : undefined,
        required: f.get("required") === "on",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      el.reset();
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteQuestion(id);
      router.refresh();
    });
  }

  function toggleActive() {
    startTransition(async () => {
      await setSurveyActive(surveyId, !isActive);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            isActive ? "bg-green-100 text-green-800" : "bg-secondary"
          }`}
        >
          {isActive ? "aktiv" : "inaktiv"}
        </span>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={toggleActive}>
          {isActive ? "Deaktivieren" : "Aktivieren"}
        </Button>
      </div>

      <div className="space-y-2">
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Fragen.</p>
        ) : (
          questions.map((q, i) => (
            <div
              key={q.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <span className="min-w-0">
                <span className="text-muted-foreground">{i + 1}.</span> {q.label}{" "}
                <span className="text-xs text-muted-foreground">
                  ({q.type}
                  {q.required ? ", Pflicht" : ""})
                </span>
              </span>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(q.id)}>
                ✕
              </Button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={add} className="space-y-3 rounded-lg border p-4">
        <p className="font-medium">Frage hinzufügen</p>
        <div className="space-y-2">
          <Label htmlFor="q-label">Fragetext</Label>
          <Input id="q-label" name="label" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="q-type">Typ</Label>
            <select
              id="q-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="rating">Bewertung (1–5)</option>
              <option value="text">Freitext</option>
              <option value="choice">Auswahl</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="required" defaultChecked /> Pflichtfeld
          </label>
        </div>
        {type === "choice" && (
          <div className="space-y-2">
            <Label htmlFor="q-options">Optionen (kommagetrennt)</Label>
            <Input id="q-options" name="options" placeholder="Ja, Nein, Vielleicht" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending}>
          Frage hinzufügen
        </Button>
      </form>
    </div>
  );
}
