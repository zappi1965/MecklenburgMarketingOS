"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQrCode, setQrActive } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface QrItem {
  id: string;
  token: string;
  label: string | null;
  targetType: string;
  isActive: boolean;
  scanUrl: string;
  dataUrl: string;
}

export function QrManager({
  programId,
  qrs,
  canManage,
}: {
  programId: string;
  qrs: QrItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createQrCode({ programId, label, targetType: "stamp" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLabel("");
      router.refresh();
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setQrActive(id, isActive);
      router.refresh();
    });
  }

  function download(qr: QrItem) {
    const a = document.createElement("a");
    a.href = qr.dataUrl;
    a.download = `qr-${qr.label ?? qr.token}.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="qr-label">Neuer QR-Code (Label)</Label>
            <Input
              id="qr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z. B. Theke"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Erstellen
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {qrs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine QR-Codes.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {qrs.map((qr) => (
            <div
              key={qr.id}
              className={`rounded-lg border p-4 text-center ${
                qr.isActive ? "" : "opacity-50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.dataUrl}
                alt={`QR ${qr.label ?? qr.token}`}
                className="mx-auto h-40 w-40"
              />
              <p className="mt-2 text-sm font-medium">
                {qr.label ?? "Ohne Label"}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {qr.scanUrl}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => download(qr)}>
                  PNG
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => toggle(qr.id, !qr.isActive)}
                  >
                    {qr.isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
