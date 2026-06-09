"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCoupon,
  setCouponActive,
  redeemCoupon,
  checkCoupon,
} from "@/actions/coupon";
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

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  isActive: boolean;
}

function discountLabel(type: string, value: number): string {
  return type === "percent" ? `${value}%` : formatPrice(value);
}

export function CouponAdmin({
  coupons,
  canManage,
  canOperate,
}: {
  coupons: Coupon[];
  canManage: boolean;
  canOperate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createCoupon({
        code: String(f.get("code") ?? ""),
        description: String(f.get("description") ?? ""),
        discountType,
        discountValue: Number(f.get("discountValue") ?? 0),
        maxRedemptions: f.get("maxRedemptions")
          ? Number(f.get("maxRedemptions"))
          : undefined,
        expiresAt: String(f.get("expiresAt") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setMessage(`Code erstellt: ${result.data.code}`);
      router.refresh();
    });
  }

  function redeem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    const code = String(f.get("code") ?? "");
    startTransition(async () => {
      const result = await redeemCoupon(code);
      if (!result.ok) return setError(result.error);
      el.reset();
      setMessage(
        `Eingelöst: ${discountLabel(result.data.discountType, result.data.discountValue)} Rabatt.`,
      );
      router.refresh();
    });
  }

  function check(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await checkCoupon(String(f.get("code") ?? ""));
      if (!result.ok) return setError(result.error);
      setMessage(
        result.data.valid
          ? `Gültig: ${discountLabel(result.data.discountType, result.data.discountValue)} Rabatt.`
          : `Ungültig: ${result.data.reason}`,
      );
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setCouponActive(id, isActive);
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
              <CardTitle className="text-base">Neuer Code</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={create} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="code">Code (leer = automatisch)</Label>
                  <Input id="code" name="code" placeholder="SOMMER10" className="uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Typ</Label>
                    <select
                      id="discountType"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="percent">Prozent (%)</option>
                      <option value="fixed">Betrag (€)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">Wert</Label>
                    <Input id="discountValue" name="discountValue" type="number" min={1} step="0.01" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxRedemptions">Max. Einlösungen</Label>
                    <Input id="maxRedemptions" name="maxRedemptions" type="number" min={1} placeholder="∞" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Gültig bis</Label>
                    <Input id="expiresAt" name="expiresAt" type="datetime-local" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Input id="description" name="description" />
                </div>
                <Button type="submit" disabled={isPending}>
                  Code erstellen
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {canOperate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Einlösen / Prüfen</CardTitle>
              <CardDescription>Code an der Kasse einlösen oder prüfen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={redeem} className="flex gap-2">
                <Input name="code" placeholder="CODE" className="font-mono uppercase" required />
                <Button type="submit" disabled={isPending}>
                  Einlösen
                </Button>
              </form>
              <form onSubmit={check} className="flex gap-2">
                <Input name="code" placeholder="CODE prüfen" className="font-mono uppercase" required />
                <Button type="submit" variant="outline" disabled={isPending}>
                  Prüfen
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Codes.</p>
          ) : (
            coupons.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0 last:pb-0 ${
                  c.isActive ? "" : "opacity-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono font-medium">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {discountLabel(c.discountType, c.discountValue)} Rabatt ·{" "}
                    {c.redemptionCount}
                    {c.maxRedemptions != null ? `/${c.maxRedemptions}` : ""} eingelöst
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => toggle(c.id, !c.isActive)}>
                    {c.isActive ? "Pause" : "Aktiv"}
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
