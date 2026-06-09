"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ReviewForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ googleUrl: string | null } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Bitte vergib eine Sternebewertung.");
      return;
    }
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitReview({
        token,
        rating,
        comment: String(form.get("comment") ?? ""),
        authorName: String(form.get("authorName") ?? ""),
        authorEmail: String(form.get("authorEmail") ?? ""),
        consent: consent as true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone({ googleUrl: result.data.googleUrl });
    });
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Danke! 🙏</CardTitle>
          <CardDescription>
            Deine Bewertung wurde gespeichert.
          </CardDescription>
        </CardHeader>
        {done.googleUrl && (
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Würdest du uns auch auf Google bewerten?
            </p>
            <a href={done.googleUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">Auf Google bewerten</Button>
            </a>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Wie war es bei uns?</CardTitle>
        <CardDescription>Deine Meinung hilft uns weiter.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="text-4xl leading-none transition-transform hover:scale-110"
                aria-label={`${n} Sterne`}
              >
                <span
                  className={
                    n <= (hover || rating)
                      ? "text-yellow-400"
                      : "text-muted-foreground/30"
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar (optional)</Label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Was hat dir gefallen?"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="authorName">Name</Label>
              <Input id="authorName" name="authorName" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorEmail">E-Mail</Label>
              <Input
                id="authorEmail"
                name="authorEmail"
                type="email"
                placeholder="Optional"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ich bin damit einverstanden, dass meine Bewertung gespeichert und
              ggf. veröffentlicht wird (DSGVO).
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardContent>
          <Button type="submit" className="w-full" disabled={isPending || !consent}>
            {isPending ? "Sende…" : "Bewertung abschicken"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
