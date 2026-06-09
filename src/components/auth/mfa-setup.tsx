"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  enrollMfa,
  confirmMfaEnrollment,
  unenrollMfa,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MfaSetupProps {
  enabled: boolean;
  factorId: string | null;
}

export function MfaSetup({ enabled, factorId }: MfaSetupProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");

  function startEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await enrollMfa();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnrollment(result.data);
    });
  }

  function confirm() {
    if (!enrollment) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmMfaEnrollment({
        factorId: enrollment.factorId,
        code,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnrollment(null);
      setCode("");
      router.refresh();
    });
  }

  function disable() {
    if (!factorId) return;
    setError(null);
    startTransition(async () => {
      const result = await unenrollMfa(factorId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ Zwei-Faktor-Authentifizierung ist aktiv.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={disable}
          disabled={isPending}
        >
          MFA deaktivieren
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scanne den QR-Code mit deiner Authenticator-App (z. B. Google
          Authenticator) und gib anschließend den 6-stelligen Code ein.
        </p>
        {/* qr_code is an SVG data URI returned by Supabase. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enrollment.qrCode}
          alt="MFA QR-Code"
          className="h-44 w-44 rounded-md border bg-white p-2"
        />
        <p className="break-all text-xs text-muted-foreground">
          Manueller Schlüssel: <code>{enrollment.secret}</code>
        </p>
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={confirm} disabled={isPending || code.length !== 6}>
            Aktivieren
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setEnrollment(null);
              setError(null);
            }}
            disabled={isPending}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Schütze dein Konto mit einem zweiten Faktor (TOTP).
      </p>
      <Button onClick={startEnroll} disabled={isPending}>
        MFA einrichten
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
