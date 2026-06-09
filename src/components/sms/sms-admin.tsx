"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addSmsContact,
  createSmsCampaign,
  sendSmsCampaign,
  deleteSmsCampaign,
} from "@/actions/sms";
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
  message: string;
  status: string;
  recipientCount: number;
  createdAt: Date;
}

export function SmsAdmin({
  campaigns,
  contactCount,
  canManage,
}: {
  campaigns: Campaign[];
  contactCount: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await addSmsContact({
        phone: String(f.get("phone") ?? ""),
        name: String(f.get("name") ?? ""),
        consent: consent as true,
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setConsent(false);
      setMessage("Kontakt gespeichert.");
      router.refresh();
    });
  }

  function createCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createSmsCampaign({
        message: String(f.get("message") ?? ""),
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
      const result = await sendSmsCampaign(id);
      if (!result.ok) return setError(result.error);
      setMessage(`Versendet: ${result.data.sent} · fehlgeschlagen: ${result.data.failed}`);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteSmsCampaign(id);
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
                {contactCount} Opt-in-Kontakt(e). Nur mit Einwilligung.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addContact} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input id="phone" name="phone" placeholder="+4915112345678" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input id="name" name="name" />
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Kunde hat der Zusendung von Werbe-SMS zugestimmt.</span>
                </label>
                <Button type="submit" disabled={isPending || !consent}>
                  Hinzufügen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Neue SMS-Kampagne</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createCampaign} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sms-message">Nachricht</Label>
                  <textarea
                    id="sms-message"
                    name="message"
                    rows={3}
                    maxLength={459}
                    required
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Heute 20% auf alles! …"
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
                  <p className="truncate text-sm">{c.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status}
                    {c.status === "sent" ? ` · ${c.recipientCount} Empfänger` : ""}
                  </p>
                </div>
                {canManage && c.status === "draft" && (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={isPending} onClick={() => send(c.id)}>
                      Senden
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(c.id)}>
                      ✕
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
