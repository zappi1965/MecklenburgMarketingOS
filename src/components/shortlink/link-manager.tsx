"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createShortLink,
  setShortLinkActive,
  deleteShortLink,
} from "@/actions/shortlink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LinkRow {
  id: string;
  code: string;
  destinationUrl: string;
  title: string | null;
  clickCount: number;
  isActive: boolean;
}

export function LinkManager({
  links,
  baseUrl,
  canManage,
}: {
  links: LinkRow[];
  baseUrl: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createShortLink({
        destinationUrl: String(f.get("destinationUrl") ?? ""),
        title: String(f.get("title") ?? ""),
        utmSource: String(f.get("utmSource") ?? ""),
        utmMedium: String(f.get("utmMedium") ?? ""),
        utmCampaign: String(f.get("utmCampaign") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setCreated(result.data.url);
      router.refresh();
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setShortLinkActive(id, isActive);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteShortLink(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <form onSubmit={create} className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">Neuer Link</p>
          <div className="space-y-2">
            <Label htmlFor="destinationUrl">Ziel-URL</Label>
            <Input id="destinationUrl" name="destinationUrl" type="url" placeholder="https://…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titel (optional)</Label>
            <Input id="title" name="title" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="utmSource">utm_source</Label>
              <Input id="utmSource" name="utmSource" placeholder="instagram" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmMedium">utm_medium</Label>
              <Input id="utmMedium" name="utmMedium" placeholder="social" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmCampaign">utm_campaign</Label>
              <Input id="utmCampaign" name="utmCampaign" placeholder="sommer" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending}>
            Link erstellen
          </Button>
          {created && (
            <Input readOnly value={created} onFocus={(e) => e.target.select()} />
          )}
        </form>
      )}

      <div className="space-y-2">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Links.</p>
        ) : (
          links.map((l) => (
            <div
              key={l.id}
              className={`flex items-center justify-between gap-2 rounded-md border p-3 text-sm ${
                l.isActive ? "" : "opacity-50"
              }`}
            >
              <div className="min-w-0">
                <p className="font-mono font-medium">
                  {baseUrl}/l/{l.code}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  → {l.destinationUrl}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-muted-foreground">
                  {l.clickCount} Klicks
                </span>
                {canManage && (
                  <>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => toggle(l.id, !l.isActive)}>
                      {l.isActive ? "Pause" : "Aktiv"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(l.id)}>
                      ✕
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
