"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSurvey } from "@/actions/survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SurveyCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createSurvey({
        title: String(f.get("title") ?? ""),
        description: String(f.get("description") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/dashboard/surveys/${result.data.id}`);
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Neue Umfrage</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Input id="description" name="description" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          Erstellen
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
