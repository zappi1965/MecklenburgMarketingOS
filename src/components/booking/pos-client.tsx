"use client";

import { useState, useTransition } from "react";
import { adjustPoints } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RecentMember {
  id: string;
  label: string;
  balance: number;
}

export function PosClient({ recent }: { recent: RecentMember[] }) {
  const [isPending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState("");
  const [points, setPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function award() {
    setError(null);
    setResult(null);
    const value = Number(points);
    if (!memberId || !value) {
      setError("Mitglied und Punkte angeben.");
      return;
    }
    startTransition(async () => {
      const res = await adjustPoints({
        memberId,
        points: value,
        reason: "POS-Gutschrift",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(`Gutgeschrieben. Neues Guthaben: ${res.data.balance} Punkte.`);
      setPoints("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pos-member">Mitglieds-ID</Label>
        <Input
          id="pos-member"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="UUID des Kunden"
          className="font-mono"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pos-points">Punkte</Label>
        <Input
          id="pos-points"
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="z. B. 5"
        />
      </div>
      <Button onClick={award} disabled={isPending}>
        Punkte gutschreiben
      </Button>
      {result && (
        <p className="text-sm text-green-600 dark:text-green-400">{result}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {recent.length > 0 && (
        <div className="space-y-1 pt-2">
          <p className="text-sm font-medium">Zuletzt aktive Mitglieder</p>
          {recent.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="font-mono text-xs">{m.label}</span>
              <span className="text-muted-foreground">{m.balance} P.</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
