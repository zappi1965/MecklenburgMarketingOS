"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createService, createSlot, cancelBooking } from "@/actions/booking";
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

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
}
interface Slot {
  id: string;
  serviceName: string;
  startsAt: Date;
  capacity: number;
  bookedCount: number;
}
interface Booking {
  id: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  code: string;
  startsAt: Date | null;
  serviceName: string;
}

export function BookingAdmin({
  services,
  slots,
  bookings,
  canManage,
  canOperate,
}: {
  services: Service[];
  slots: Slot[];
  bookings: Booking[];
  canManage: boolean;
  canOperate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");

  function addService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createService({
        name: String(form.get("name") ?? ""),
        durationMinutes: Number(form.get("durationMinutes") ?? 30),
        priceCents: form.get("price") ? Number(form.get("price")) * 100 : undefined,
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function addSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createSlot({
        serviceId,
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
        capacity: Number(form.get("capacity") ?? 1),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function cancel(id: string) {
    startTransition(async () => {
      const result = await cancelBooking(id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleString("de-DE") : "—";

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {canManage && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service anlegen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addService} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="s-name">Name</Label>
                  <Input id="s-name" name="name" placeholder="Beratung" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="s-dur">Dauer (Min.)</Label>
                    <Input id="s-dur" name="durationMinutes" type="number" min={5} defaultValue={30} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-price">Preis (€)</Label>
                    <Input id="s-price" name="price" type="number" min={0} placeholder="optional" />
                  </div>
                </div>
                <Button type="submit" disabled={isPending}>
                  Anlegen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Slot hinzufügen</CardTitle>
              <CardDescription>Buchbares Zeitfenster.</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Lege zuerst einen Service an.
                </p>
              ) : (
                <form onSubmit={addSlot} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="slot-service">Service</Label>
                    <select
                      id="slot-service"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="slot-start">Start</Label>
                      <Input id="slot-start" name="startsAt" type="datetime-local" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slot-end">Ende</Label>
                      <Input id="slot-end" name="endsAt" type="datetime-local" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slot-cap">Kapazität</Label>
                    <Input id="slot-cap" name="capacity" type="number" min={1} defaultValue={1} />
                  </div>
                  <Button type="submit" disabled={isPending}>
                    Slot anlegen
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kommende Slots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Slots.</p>
          ) : (
            slots.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0"
              >
                <span>
                  {s.serviceName} · {fmt(s.startsAt)}
                </span>
                <span className="text-muted-foreground">
                  {s.bookedCount}/{s.capacity}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Buchungen.</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0 last:pb-0 ${
                  b.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {b.customerName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {b.code}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.serviceName} · {fmt(b.startsAt)} · {b.status}
                  </p>
                </div>
                {canOperate && b.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => cancel(b.id)}
                  >
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
