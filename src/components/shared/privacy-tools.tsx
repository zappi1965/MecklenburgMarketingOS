"use client";

import { useState, useTransition } from "react";
import {
  dsarExport,
  softDeleteSubject,
  hardDeleteSubject,
} from "@/actions/tenant";
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

interface PrivacyToolsProps {
  isSuperadmin: boolean;
}

export function PrivacyTools({ isSuperadmin }: PrivacyToolsProps) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMessage(null);
    setError(null);
  }

  function handleExport() {
    reset();
    startTransition(async () => {
      const result = await dsarExport({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsar-${email}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export heruntergeladen.");
    });
  }

  function handleSoftDelete() {
    reset();
    startTransition(async () => {
      const result = await softDeleteSubject({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Soft-Delete: ${result.data.members} Mitglied(er), ${result.data.reviews} Bewertung(en) markiert.`,
      );
    });
  }

  function handleHardDelete() {
    reset();
    if (
      !confirm(
        `Wirklich ALLE personenbezogenen Daten von ${email} endgültig löschen? Das kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await hardDeleteSubject({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Endgültig gelöscht: ${result.data.members} Mitglied(er), ${result.data.reviews} Bewertung(en).`,
      );
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Datenschutz / DSGVO</CardTitle>
        <CardDescription>
          Auskunft (DSAR-Export) und Löschung für eine betroffene Person per
          E-Mail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject-email">E-Mail der betroffenen Person</Label>
          <Input
            id="subject-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kunde@example.com"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={isPending || !email}>
            Daten exportieren (JSON)
          </Button>
          <Button
            variant="outline"
            onClick={handleSoftDelete}
            disabled={isPending || !email}
          >
            Soft-Delete
          </Button>
          {isSuperadmin && (
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={isPending || !email}
            >
              Hard-Delete (Superadmin)
            </Button>
          )}
        </div>

        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
