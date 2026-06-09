"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, verifyMfa } from "@/actions/auth";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.status === "mfa_required") {
        setMfaFactorId(result.data.factorId);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyMfa({ factorId: mfaFactorId, code });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mfaFactorId ? "Bestätigung" : "Anmelden"}</CardTitle>
        <CardDescription>
          {mfaFactorId
            ? "Gib den 6-stelligen Code aus deiner Authenticator-App ein."
            : "Melde dich bei deinem MMOS-Konto an."}
        </CardDescription>
      </CardHeader>

      {mfaFactorId ? (
        <form onSubmit={handleMfaSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Authenticator-Code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Prüfe…" : "Bestätigen"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMfaFactorId(null);
                setCode("");
                setError(null);
              }}
            >
              Zurück
            </Button>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Melde an…" : "Anmelden"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Noch kein Konto?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Registrieren
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
