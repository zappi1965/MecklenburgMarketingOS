"use client";

import { useState, useTransition } from "react";
import { claimReferral, type ReferralLanding } from "@/actions/referral";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "mmos_member";

export function ReferralClaim({
  code,
  landing,
}: {
  code: string;
  landing: ReferralLanding;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ bonus: number; balance: number } | null>(
    null,
  );

  function claim() {
    setError(null);
    startTransition(async () => {
      const stored = localStorage.getItem(STORAGE_KEY) ?? undefined;
      const result = await claimReferral({ code, refereeMemberId: stored });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      localStorage.setItem(STORAGE_KEY, result.data.refereeMemberId);
      setDone({ bonus: result.data.refereeBonus, balance: result.data.balance });
    });
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Willkommen 🎁</CardTitle>
          <CardDescription>
            Du hast {done.bonus} Bonus-Punkte erhalten!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{done.balance}</p>
          <p className="text-sm text-muted-foreground">Punkte</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <CardTitle>Du wurdest empfohlen!</CardTitle>
        <CardDescription>
          Sammle bei {landing.tenantName} mit und sichere dir{" "}
          <strong>{landing.refereeBonus} Bonus-Punkte</strong> zum Start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" onClick={claim} disabled={isPending}>
          {isPending ? "Löse ein…" : "Bonus einlösen"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
