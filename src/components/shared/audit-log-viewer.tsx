"use client";

import { useState, useTransition } from "react";
import { exportAuditLog } from "@/actions/tenant";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  action: string;
  entityTable: string;
  entityId: string | null;
  actorId: string | null;
  createdAt: Date;
}

export function AuditLogViewer({ entries }: { entries: AuditEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportAuditLog();
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
      a.download = `audit-log-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Letzte {entries.length} Einträge · unveränderlich
        </p>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={isPending}>
          Vollständig exportieren (JSON)
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Zeitpunkt</th>
              <th className="px-3 py-2 font-medium">Aktion</th>
              <th className="px-3 py-2 font-medium">Tabelle</th>
              <th className="px-3 py-2 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Noch keine Einträge.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString("de-DE")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.entityTable}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                    {e.entityId ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
