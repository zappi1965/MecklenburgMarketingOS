"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  issueGiftCard,
  redeemGiftCard,
  cancelGiftCard,
} from "@/actions/giftcard";
import { formatPrice } from "@/lib/tools";
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

interface GiftCard {
  id: string;
  code: string;
  initialAmountCents: number;
  balanceCents: number;
  status: string;
  recipientName: string | null;
  createdAt: Date;
}

export function GiftCardAdmin({
  cards,
  canManage,
  canOperate,
}: {
  cards: GiftCard[];
  canManage: boolean;
  canOperate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  function issue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIssuedCode(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    const euros = Number(f.get("amount") ?? 0);
    startTransition(async () => {
      const result = await issueGiftCard({
        amountCents: Math.round(euros * 100),
        recipientName: String(f.get("recipientName") ?? ""),
        recipientEmail: String(f.get("recipientEmail") ?? ""),
        message: String(f.get("message") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setIssuedCode(result.data.code);
      router.refresh();
    });
  }

  function redeem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    const euros = Number(f.get("amount") ?? 0);
    startTransition(async () => {
      const result = await redeemGiftCard({
        code: String(f.get("code") ?? ""),
        amountCents: Math.round(euros * 100),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setMessage(`Eingelöst. Restguthaben: ${formatPrice(result.data.balanceCents)}`);
      router.refresh();
    });
  }

  function cancel(code: string) {
    startTransition(async () => {
      const result = await cancelGiftCard(code);
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

      <div className="grid gap-4 md:grid-cols-2">
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gutschein ausstellen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={issue} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Betrag (€)</Label>
                  <Input id="amount" name="amount" type="number" min={1} step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Empfänger (optional)</Label>
                  <Input id="recipientName" name="recipientName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">E-Mail (optional)</Label>
                  <Input id="recipientEmail" name="recipientEmail" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Nachricht (optional)</Label>
                  <Input id="message" name="message" />
                </div>
                <Button type="submit" disabled={isPending}>
                  Ausstellen
                </Button>
                {issuedCode && (
                  <p className="text-sm">
                    Code:{" "}
                    <span className="font-mono font-bold">{issuedCode}</span>
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {canOperate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Einlösen (Kasse)</CardTitle>
              <CardDescription>Teilbeträge möglich.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={redeem} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="r-code">Code</Label>
                  <Input id="r-code" name="code" className="font-mono uppercase" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-amount">Betrag (€)</Label>
                  <Input id="r-amount" name="amount" type="number" min={0.01} step="0.01" required />
                </div>
                <Button type="submit" disabled={isPending}>
                  Einlösen
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gutscheine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Gutscheine.</p>
          ) : (
            cards.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0 last:pb-0 ${
                  c.status !== "active" ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono font-medium">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(c.balanceCents)} / {formatPrice(c.initialAmountCents)} ·{" "}
                    {c.status}
                    {c.recipientName ? ` · ${c.recipientName}` : ""}
                  </p>
                </div>
                {canManage && c.status === "active" && (
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => cancel(c.code)}>
                    Stornieren
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
