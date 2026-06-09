"use client";

import { useEffect, useState, useCallback } from "react";
import {
  processScan,
  listRewardsForToken,
  redeemReward,
  type ScanResult,
  type PublicReward,
} from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "mmos_member";

export function ScanClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [rewards, setRewards] = useState<PublicReward[]>([]);
  const [claim, setClaim] = useState<{ code: string; name: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = localStorage.getItem(STORAGE_KEY) ?? undefined;
      const res = await processScan({ token, memberId: stored });
      if (!active) return;
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, res.data.memberId);
      setResult(res.data);
      const rw = await listRewardsForToken(token);
      if (active && rw.ok) setRewards(rw.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleRedeem = useCallback(
    async (reward: PublicReward) => {
      if (!result) return;
      setError(null);
      setPending(true);
      const res = await redeemReward({
        rewardId: reward.id,
        memberId: result.memberId,
      });
      setPending(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setClaim({ code: res.data.code, name: reward.name });
      setResult({ ...result, balance: res.data.balance });
    },
    [result],
  );

  if (loading) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Einen Moment…</CardTitle>
          <CardDescription>Dein Scan wird verarbeitet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error && !result) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Hoppla</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (claim) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Reward eingelöst 🎉</CardTitle>
          <CardDescription>
            Zeige diesen Code an der Kasse für „{claim.name}“.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border-2 border-dashed py-4 text-3xl font-bold tracking-[0.3em]">
            {claim.code}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Neues Guthaben: {result?.balance} Punkte
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const stamps = result.stampsPerCard;
  const progress = stamps ? result.balance % stamps : null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>{result.programName}</CardTitle>
        <CardDescription>
          {result.throttled
            ? "Du warst gerade eben schon hier — dein nächster Stempel kommt bald."
            : result.awarded > 0
              ? `+${result.awarded} Punkt${result.awarded === 1 ? "" : "e"} gutgeschrieben!`
              : "Willkommen zurück!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-center">
          <p className="text-4xl font-bold">{result.balance}</p>
          <p className="text-sm text-muted-foreground">Punkte</p>
        </div>

        {stamps && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: stamps }).map((_, i) => (
              <span
                key={i}
                className={`h-6 w-6 rounded-full border-2 ${
                  i < (progress ?? 0)
                    ? "border-primary bg-primary"
                    : "border-muted"
                }`}
              />
            ))}
          </div>
        )}

        {rewards.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rewards einlösen</p>
            {rewards.map((r) => {
              const affordable = result.balance >= r.pointsCost;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.pointsCost} Punkte
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!affordable || pending}
                    onClick={() => handleRedeem(r)}
                  >
                    {affordable ? "Einlösen" : "Zu wenig"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
