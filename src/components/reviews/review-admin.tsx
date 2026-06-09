"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvitation, upsertReviewSource } from "@/actions/reviews";
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

export function ReviewAdmin({
  source,
}: {
  source: {
    label: string;
    externalUrl: string | null;
    redirectThreshold: number;
  } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sourceMsg, setSourceMsg] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);

  function generateInvite() {
    setInviteError(null);
    setInviteUrl(null);
    startTransition(async () => {
      const result = await createInvitation({});
      if (!result.ok) {
        setInviteError(result.error);
        return;
      }
      setInviteUrl(result.data.url);
      router.refresh();
    });
  }

  function saveSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSourceMsg(null);
    setSourceError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertReviewSource({
        type: "google",
        label: String(form.get("label") ?? "Google"),
        externalUrl: String(form.get("externalUrl") ?? ""),
        redirectThreshold: Number(form.get("redirectThreshold") ?? 4),
      });
      if (!result.ok) {
        setSourceError(result.error);
        return;
      }
      setSourceMsg("Gespeichert.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bewertung anfragen</CardTitle>
          <CardDescription>
            Erzeuge einen Einladungslink (z. B. als QR an der Theke).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={generateInvite} disabled={isPending}>
            Link erzeugen
          </Button>
          {inviteUrl && (
            <div className="space-y-1">
              <Input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
              <p className="text-xs text-muted-foreground">
                Link kopieren und teilen.
              </p>
            </div>
          )}
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google My Business</CardTitle>
          <CardDescription>
            Zufriedene Kunden (ab Schwellwert) zu Google weiterleiten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSource} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="externalUrl">Google-Bewertungs-URL</Label>
              <Input
                id="externalUrl"
                name="externalUrl"
                type="url"
                defaultValue={source?.externalUrl ?? ""}
                placeholder="https://g.page/r/…/review"
              />
              <input type="hidden" name="label" value="Google" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectThreshold">Ab Sternen weiterleiten</Label>
              <Input
                id="redirectThreshold"
                name="redirectThreshold"
                type="number"
                min={1}
                max={5}
                defaultValue={source?.redirectThreshold ?? 4}
              />
            </div>
            {sourceMsg && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {sourceMsg}
              </p>
            )}
            {sourceError && (
              <p className="text-sm text-destructive">{sourceError}</p>
            )}
            <Button type="submit" variant="outline" disabled={isPending}>
              Speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
