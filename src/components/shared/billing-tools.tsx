"use client";

import { useState, useTransition } from "react";
import {
  createCheckoutSession,
  createBillingPortalSession,
} from "@/actions/billing";
import { TOOLS, formatPrice } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ToolStatus =
  | "active"
  | "trial"
  | "past_due"
  | "cancelled"
  | "inactive"
  | undefined;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  active: { text: "Aktiv", cls: "bg-green-100 text-green-800" },
  trial: { text: "Testphase", cls: "bg-blue-100 text-blue-800" },
  past_due: { text: "Zahlung offen", cls: "bg-amber-100 text-amber-800" },
  cancelled: { text: "Gekündigt", cls: "bg-red-100 text-red-800" },
  inactive: { text: "Inaktiv", cls: "bg-secondary text-secondary-foreground" },
};

interface BillingToolsProps {
  statuses: Record<string, ToolStatus>;
  canManage: boolean;
  hasCustomer: boolean;
}

export function BillingTools({
  statuses,
  canManage,
  hasCustomer,
}: BillingToolsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function activate(toolKey: string) {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession({ toolKey });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function openPortal() {
    setError(null);
    startTransition(async () => {
      const result = await createBillingPortalSession();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="space-y-4">
      {canManage && hasCustomer && (
        <div>
          <Button variant="outline" size="sm" onClick={openPortal} disabled={isPending}>
            Abos & Rechnungen verwalten
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const status = statuses[tool.key];
          const badge = STATUS_LABEL[status ?? "inactive"];
          const isLive = status === "active" || status === "trial";
          return (
            <Card key={tool.key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{tool.name}</CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatPrice(tool.priceCents)}/Mon.
                </span>
                {canManage && !isLive && (
                  <Button
                    size="sm"
                    onClick={() => activate(tool.key)}
                    disabled={isPending}
                  >
                    Aktivieren
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
