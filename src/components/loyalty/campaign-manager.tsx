"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaign, setCampaignActive } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Campaign {
  id: string;
  name: string;
  multiplier: number;
  startsAt: Date;
  endsAt: Date;
  maxScans: number | null;
  scanCount: number;
  isActive: boolean;
}

export function CampaignManager({
  programId,
  campaigns,
  canManage,
}: {
  programId: string;
  campaigns: Campaign[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCampaign({
        programId,
        name: String(form.get("name") ?? ""),
        multiplier: Number(form.get("multiplier") ?? 2),
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
        maxScans: form.get("maxScans") ? Number(form.get("maxScans")) : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setCampaignActive(id, isActive);
      router.refresh();
    });
  }

  const now = Date.now();

  return (
    <div className="space-y-4">
      {canManage &&
        (open ? (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" name="name" placeholder="Doppelte Punkte" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-mult">Multiplikator</Label>
                <Input
                  id="c-mult"
                  name="multiplier"
                  type="number"
                  min={2}
                  max={10}
                  defaultValue={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-max">Max. Scans (optional)</Label>
                <Input id="c-max" name="maxScans" type="number" min={1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-start">Start</Label>
                <Input id="c-start" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-end">Ende</Label>
                <Input id="c-end" name="endsAt" type="datetime-local" required />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                Kampagne starten
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setOpen(true)}>
            + Neue Kampagne
          </Button>
        ))}

      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Kampagnen.</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const live =
              c.isActive &&
              new Date(c.startsAt).getTime() <= now &&
              new Date(c.endsAt).getTime() >= now;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 rounded-md border p-3 ${
                  c.isActive ? "" : "opacity-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ×{c.multiplier}
                    </span>
                    {live && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                        live
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.startsAt).toLocaleString("de-DE")} –{" "}
                    {new Date(c.endsAt).toLocaleString("de-DE")}
                    {c.maxScans
                      ? ` · ${c.scanCount}/${c.maxScans} Scans`
                      : ` · ${c.scanCount} Scans`}
                  </p>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => toggle(c.id, !c.isActive)}
                  >
                    {c.isActive ? "Stoppen" : "Aktivieren"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
