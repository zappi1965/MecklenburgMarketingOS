"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/actions/newsletter";
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

export function NewsletterSignup({
  slug,
  tenantName,
}: {
  slug: string;
  tenantName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await subscribeNewsletter({
        slug,
        email: String(form.get("email") ?? ""),
        name: String(form.get("name") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Fast geschafft ✉️</CardTitle>
          <CardDescription>
            Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige
            deine Anmeldung über den Link darin (Double-Opt-In).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Newsletter von {tenantName}</CardTitle>
        <CardDescription>Angebote & News direkt ins Postfach.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" name="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ich möchte den Newsletter erhalten und stimme der Verarbeitung
              meiner E-Mail-Adresse zu. Abmeldung jederzeit möglich.
            </span>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending || !consent}>
            {isPending ? "Sende…" : "Anmelden"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
