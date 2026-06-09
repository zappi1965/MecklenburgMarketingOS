"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<null | "confirm" | "ready">(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);
    const input = {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    startTransition(async () => {
      const result = await signUp(input);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      if (result.data.needsEmailConfirmation) {
        setDone("confirm");
      } else {
        setDone("ready");
        router.replace("/onboarding");
        router.refresh();
      }
    });
  }

  if (done === "confirm") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Fast geschafft</CardTitle>
          <CardDescription>
            Wir haben dir eine E-Mail zur Bestätigung geschickt. Bitte
            bestätige deine Adresse und melde dich anschließend an.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button className="w-full">Zum Login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Konto erstellen</CardTitle>
        <CardDescription>
          Registriere dich und richte anschließend deinen Store ein.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
            {fieldErrors.fullName && (
              <p className="text-sm text-destructive">
                {fieldErrors.fullName[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            {fieldErrors.password && (
              <p className="text-sm text-destructive">
                {fieldErrors.password[0]}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Erstelle Konto…" : "Registrieren"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Bereits registriert?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
