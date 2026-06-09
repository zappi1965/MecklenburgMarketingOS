"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRetentionCampaign,
  deleteRetentionCampaign,
  runRetentionCampaign,
  previewInactive,
} from "@/actions/retention";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Campaign {
  id: string;
  name: string;
  inactiveDays: number;
  bonusPoints: number;
  sendEmail: boolean;
  status: string;
  targetedCount: number;
  lastRunAt: Date | null;
}

export function RetentionAdmin({
  campaigns,
  canManage,
}: {
  campaigns: Campaign[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [days, setDays] = useState(60);
  const [sendEmail, setSendEmail] = useState(true);

  function runPreview() {
    setPreview(null);
    startTransition(async () => {
      const result = await previewInactive(days);
      if (result.ok) setPreview(result.data.count);
    });
  }

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createRetentionCampaign({
        name: String(f.get("name") ?? ""),
        inactiveDays: days,
        bonusPoints: Number(f.get("bonusPoints") ?? 0),
        sendEmail,
        message: String(f.get("message") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function run(id: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await runRetentionCampaign(id);
      if (!result.ok) return setError(result.error);
      setMessage(
        `Rückholaktion ausgeführt: ${result.data.targeted} Kunden, ${result.data.emailed} E-Mails.`,
      );
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteRetentionCampaign(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neue Rückholaktion</CardTitle>
            <CardDescription>
              Inaktive Kunden mit Bonus-Punkten und einer E-Mail zurückgewinnen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Komm zurück – Herbst" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inactiveDays">Inaktiv seit (Tagen)</Label>
                  <Input
                    id="inactiveDays"
                    type="number"
                    min={7}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonusPoints">Bonus-Punkte</Label>
                  <Input id="bonusPoints" name="bonusPoints" type="number" min={0} defaultValue={50} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Nachricht (optional)</Label>
                <textarea
                  id="message"
                  name="message"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Wir vermissen dich – schau bald wieder vorbei!"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                E-Mail an Kunden mit Einwilligung senden
              </label>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isPending}>
                  Aktion anlegen
                </Button>
                <Button type="button" variant="ghost" disabled={isPending} onClick={runPreview}>
                  Vorschau: betroffene Kunden
                </Button>
                {preview !== null && (
                  <span className="text-sm text-muted-foreground">
                    {preview} Kunden aktuell inaktiv
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktionen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Aktionen.</p>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    inaktiv &gt; {c.inactiveDays} Tage · +{c.bonusPoints} P.
                    {c.sendEmail ? " · E-Mail" : ""} · {c.targetedCount} erreicht
                    {c.lastRunAt
                      ? ` · zuletzt ${new Date(c.lastRunAt).toLocaleDateString("de-DE")}`
                      : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={isPending} onClick={() => run(c.id)}>
                      Ausführen
                    </Button>
                    {c.status === "draft" && (
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(c.id)}>
                        ✕
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
