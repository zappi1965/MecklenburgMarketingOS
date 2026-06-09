"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";

export function ResponseForm({
  reviewId,
  existing,
}: {
  reviewId: string;
  existing: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(existing ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await respondToReview({ reviewId, response: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Antwort an den Kunden…"
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="text-sm text-green-600 dark:text-green-400">Gespeichert.</p>
      )}
      <Button type="submit" disabled={isPending || !value.trim()}>
        Antwort speichern
      </Button>
    </form>
  );
}
