"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertReferralProgram } from "@/actions/referral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReferralAdmin({
  program,
}: {
  program: {
    referrerBonus: number;
    refereeBonus: number;
    isActive: boolean;
  } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(program?.isActive ?? true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertReferralProgram({
        referrerBonus: Number(form.get("referrerBonus") ?? 0),
        refereeBonus: Number(form.get("refereeBonus") ?? 0),
        isActive,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Gespeichert.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="referrerBonus">Bonus Werber (Punkte)</Label>
          <Input
            id="referrerBonus"
            name="referrerBonus"
            type="number"
            min={0}
            defaultValue={program?.referrerBonus ?? 50}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="refereeBonus">Bonus Neukunde (Punkte)</Label>
          <Input
            id="refereeBonus"
            name="refereeBonus"
            type="number"
            min={0}
            defaultValue={program?.refereeBonus ?? 25}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Programm aktiv
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
      <Button type="submit" disabled={isPending}>
        Speichern
      </Button>
    </form>
  );
}
