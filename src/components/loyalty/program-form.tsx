"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProgramForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProgram({
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        pointsPerScan: Number(form.get("pointsPerScan") ?? 1),
        stampsPerCard: form.get("stampsPerCard")
          ? Number(form.get("stampsPerCard"))
          : undefined,
        scanCooldownMinutes: Number(form.get("scanCooldownMinutes") ?? 60),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Neues Programm</Button>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Stempelkarte" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Input id="description" name="description" placeholder="Optional" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pointsPerScan">Punkte/Scan</Label>
          <Input
            id="pointsPerScan"
            name="pointsPerScan"
            type="number"
            min={1}
            defaultValue={1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stampsPerCard">Stempel/Karte</Label>
          <Input
            id="stampsPerCard"
            name="stampsPerCard"
            type="number"
            min={1}
            placeholder="10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scanCooldownMinutes">Cooldown (Min.)</Label>
          <Input
            id="scanCooldownMinutes"
            name="scanCooldownMinutes"
            type="number"
            min={0}
            defaultValue={60}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Speichere…" : "Anlegen"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
