"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReward, setRewardActive } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProgramOption {
  id: string;
  name: string;
}
interface Reward {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  pointsCost: number;
  isActive: boolean;
}

export function RewardManager({
  programs,
  rewards,
}: {
  programs: ProgramOption[];
  rewards: Reward[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const formEl = e.currentTarget;
    startTransition(async () => {
      const result = await createReward({
        programId,
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        pointsCost: Number(form.get("pointsCost") ?? 0),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formEl.reset();
      router.refresh();
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setRewardActive(id, isActive);
      router.refresh();
    });
  }

  const programName = (id: string) =>
    programs.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      {programs.length > 0 && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-lg border p-4"
        >
          <h2 className="font-semibold">Neuer Reward</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reward-program">Programm</Label>
              <select
                id="reward-program"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pointsCost">Punktepreis</Label>
              <Input
                id="pointsCost"
                name="pointsCost"
                type="number"
                min={1}
                defaultValue={10}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reward-name">Name</Label>
            <Input id="reward-name" name="name" placeholder="Gratis Kaffee" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reward-desc">Beschreibung</Label>
            <Input id="reward-desc" name="description" placeholder="Optional" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending}>
            Reward anlegen
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {rewards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Rewards.</p>
        ) : (
          rewards.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-2 rounded-md border p-3 ${
                r.isActive ? "" : "opacity-50"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.pointsCost} Punkte · {programName(r.programId)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => toggle(r.id, !r.isActive)}
              >
                {r.isActive ? "Deaktivieren" : "Aktivieren"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
