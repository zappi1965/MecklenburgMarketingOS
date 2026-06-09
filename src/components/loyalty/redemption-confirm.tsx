"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmRedemption, cancelRedemption } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedemptionConfirm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: "confirm" | "cancel") {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      if (action === "confirm") {
        const result = await confirmRedemption(code);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage(`Eingelöst: ${result.data.rewardName}`);
      } else {
        const result = await cancelRedemption(code);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage("Storniert und Punkte zurückgebucht.");
      }
      setCode("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Reward-Code"
          className="font-mono uppercase tracking-widest"
        />
        <Button onClick={() => run("confirm")} disabled={isPending || !code}>
          Einlösen
        </Button>
        <Button
          variant="outline"
          onClick={() => run("cancel")}
          disabled={isPending || !code}
        >
          Storno
        </Button>
      </div>
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
