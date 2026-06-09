"use client";

import { useState, useTransition } from "react";
import { createBooking, type Availability } from "@/actions/booking";
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
import { formatPrice } from "@/lib/tools";

type Slot = Availability["services"][number]["slots"][number];

export function BookingClient({ availability }: { availability: Availability }) {
  const [isPending, startTransition] = useTransition();
  const [slot, setSlot] = useState<{ slot: Slot; serviceName: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; startsAt: string } | null>(
    null,
  );

  function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBooking({
        slotId: slot.slot.id,
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(result.data);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (done) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Termin gebucht ✓</CardTitle>
          <CardDescription>{fmt(done.startsAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border-2 border-dashed py-4 text-3xl font-bold tracking-[0.3em]">
            {done.code}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Zeige diesen Code im Store vor.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (slot) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Termin bestätigen</CardTitle>
          <CardDescription>
            {slot.serviceName} · {fmt(slot.slot.startsAt)}
          </CardDescription>
        </CardHeader>
        <form onSubmit={book}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">E-Mail (für Bestätigung)</Label>
              <Input id="customerEmail" name="customerEmail" type="email" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Buche…" : "Verbindlich buchen"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSlot(null)}
              >
                Zurück
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{availability.tenantName}</CardTitle>
        <CardDescription>Termin auswählen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {availability.services.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Derzeit keine Services verfügbar.
          </p>
        )}
        {availability.services.map((service) => (
          <div key={service.id} className="space-y-2">
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-xs text-muted-foreground">
                {service.durationMinutes} Min.
                {service.priceCents != null
                  ? ` · ${formatPrice(service.priceCents)}`
                  : ""}
              </p>
            </div>
            {service.slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Keine freien Termine.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {service.slots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSlot({ slot: s, serviceName: service.name })}
                    className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    {fmt(s.startsAt)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
