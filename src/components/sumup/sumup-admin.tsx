"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordManualSale,
  createPaymentLink,
  markTransactionPaid,
} from "@/actions/sumup";
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

interface Txn {
  id: string;
  reference: string;
  amountCents: number;
  description: string | null;
  status: string;
  source: string;
  createdAt: Date;
}

export function SumUpAdmin({
  transactions,
  canManage,
}: {
  transactions: Txn[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  function recordSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPayUrl(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await recordManualSale({
        amountEuros: Number(f.get("amount") ?? 0),
        description: String(f.get("description") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setMessage("Umsatz erfasst.");
      router.refresh();
    });
  }

  function paymentLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPayUrl(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createPaymentLink({
        amountEuros: Number(f.get("amount") ?? 0),
        description: String(f.get("description") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      if (result.data.payUrl) {
        setPayUrl(result.data.payUrl);
        setMessage("Payment-Link erstellt.");
      } else {
        setMessage(`Checkout erstellt (ID ${result.data.checkoutId ?? "—"}).`);
      }
      router.refresh();
    });
  }

  function markPaid(id: string) {
    startTransition(async () => {
      await markTransactionPaid(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
      {payUrl && (
        <div className="rounded-md border p-3">
          <p className="mb-1 text-sm font-medium">Payment-Link</p>
          <Input readOnly value={payUrl} onFocus={(e) => e.target.select()} />
        </div>
      )}

      {canManage && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Umsatz erfassen</CardTitle>
              <CardDescription>Barzahlung oder Terminal-Verkauf.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={recordSale} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="m-amount">Betrag (€)</Label>
                  <Input id="m-amount" name="amount" type="number" min={0.01} step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-desc">Beschreibung</Label>
                  <Input id="m-desc" name="description" />
                </div>
                <Button type="submit" disabled={isPending}>
                  Erfassen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment-Link (SumUp)</CardTitle>
              <CardDescription>Kartenzahlung per Link anfordern.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={paymentLink} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="l-amount">Betrag (€)</Label>
                  <Input id="l-amount" name="amount" type="number" min={0.01} step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l-desc">Beschreibung</Label>
                  <Input id="l-desc" name="description" />
                </div>
                <Button type="submit" variant="outline" disabled={isPending}>
                  Link erstellen
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaktionen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Umsätze.</p>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">{formatPrice(t.amountCents)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.description ?? t.reference} · {t.source} · {t.status} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                {canManage && t.status === "pending" && (
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => markPaid(t.id)}>
                    Als bezahlt
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
