"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addContact,
  createCampaign,
  sendCampaign,
  deleteCampaign,
} from "@/actions/newsletter";
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
  subject: string;
  status: string;
  recipientCount: number;
  sentAt: Date | null;
  createdAt: Date;
}

export function NewsletterAdmin({
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

  function onAddContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await addContact({
        email: String(form.get("email") ?? ""),
        name: String(form.get("name") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setMessage("Kontakt hinzugefügt.");
      router.refresh();
    });
  }

  function onCreateCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createCampaign({
        subject: String(form.get("subject") ?? ""),
        bodyHtml: String(form.get("bodyHtml") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function send(id: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendCampaign(id);
      if (!result.ok) return setError(result.error);
      setMessage(
        `Versendet: ${result.data.sent} · fehlgeschlagen: ${result.data.failed} · übersprungen (kein Consent): ${result.data.skipped}`,
      );
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCampaign(id);
      if (!result.ok) setError(result.error);
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
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontakt hinzufügen</CardTitle>
              <CardDescription>
                Mit direkter Einwilligung (z. B. am POS erfasst).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onAddContact} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="c-email">E-Mail</Label>
                  <Input id="c-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-name">Name (optional)</Label>
                  <Input id="c-name" name="name" />
                </div>
                <Button type="submit" disabled={isPending}>
                  Hinzufügen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Neue Kampagne</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreateCampaign} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cmp-subject">Betreff</Label>
                  <Input id="cmp-subject" name="subject" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cmp-body">Inhalt (HTML erlaubt)</Label>
                  <textarea
                    id="cmp-body"
                    name="bodyHtml"
                    rows={4}
                    required
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="<h1>Neuigkeiten</h1><p>…</p>"
                  />
                </div>
                <Button type="submit" disabled={isPending}>
                  Als Entwurf speichern
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kampagnen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Kampagnen.</p>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status}
                    {c.status === "sent"
                      ? ` · ${c.recipientCount} Empfänger`
                      : ""}{" "}
                    · {new Date(c.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                {canManage && c.status === "draft" && (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={isPending} onClick={() => send(c.id)}>
                      Senden
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => remove(c.id)}
                    >
                      Löschen
                    </Button>
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
