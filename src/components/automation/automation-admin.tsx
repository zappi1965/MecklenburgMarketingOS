"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFlow,
  setFlowActive,
  deleteFlow,
  runAutomations,
} from "@/actions/automation";
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

interface Flow {
  id: string;
  name: string;
  triggerType: string;
  threshold: number | null;
  actionType: string;
  actionPoints: number | null;
  isActive: boolean;
  runCount: number;
  lastRunAt: Date | null;
}

const TRIGGER_LABEL: Record<string, string> = {
  first_scan: "Erster Scan",
  points_reached: "Punkte-Schwelle",
};
const ACTION_LABEL: Record<string, string> = {
  add_points: "Bonus-Punkte",
  send_email: "E-Mail senden",
};

export function AutomationAdmin({
  flows,
  canManage,
}: {
  flows: Flow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<"first_scan" | "points_reached">("points_reached");
  const [action, setAction] = useState<"add_points" | "send_email">("add_points");

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createFlow({
        name: String(f.get("name") ?? ""),
        triggerType: trigger,
        threshold: f.get("threshold") ? Number(f.get("threshold")) : undefined,
        actionType: action,
        actionPoints: f.get("actionPoints") ? Number(f.get("actionPoints")) : undefined,
        emailSubject: String(f.get("emailSubject") ?? ""),
        emailBody: String(f.get("emailBody") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function runAll() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await runAutomations();
      if (!result.ok) return setError(result.error);
      setMessage(`${result.data.executed} Aktion(en) ausgeführt.`);
      router.refresh();
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setFlowActive(id, isActive);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteFlow(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}

      {canManage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Flows werden im MVP manuell ausgeführt (später per Zeitplan).
          </p>
          <Button onClick={runAll} disabled={isPending}>
            Jetzt ausführen
          </Button>
        </div>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuer Flow</CardTitle>
            <CardDescription>Wenn (Trigger) → Dann (Aktion).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Treue-Bonus ab 100 Punkten" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trigger">Wenn</Label>
                  <select
                    id="trigger"
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value as typeof trigger)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="points_reached">Punkte-Schwelle erreicht</option>
                    <option value="first_scan">Erster Scan</option>
                  </select>
                </div>
                {trigger === "points_reached" && (
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Schwelle (Punkte)</Label>
                    <Input id="threshold" name="threshold" type="number" min={1} defaultValue={100} />
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="action">Dann</Label>
                  <select
                    id="action"
                    value={action}
                    onChange={(e) => setAction(e.target.value as typeof action)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="add_points">Bonus-Punkte gutschreiben</option>
                    <option value="send_email">E-Mail senden</option>
                  </select>
                </div>
                {action === "add_points" && (
                  <div className="space-y-2">
                    <Label htmlFor="actionPoints">Bonus-Punkte</Label>
                    <Input id="actionPoints" name="actionPoints" type="number" min={1} defaultValue={20} />
                  </div>
                )}
              </div>
              {action === "send_email" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="emailSubject">Betreff</Label>
                    <Input id="emailSubject" name="emailSubject" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailBody">Text</Label>
                    <textarea
                      id="emailBody"
                      name="emailBody"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              <Button type="submit" disabled={isPending}>
                Flow anlegen
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {flows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Flows.</p>
          ) : (
            flows.map((flow) => (
              <div
                key={flow.id}
                className={`flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0 ${
                  flow.isActive ? "" : "opacity-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{flow.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TRIGGER_LABEL[flow.triggerType]}
                    {flow.threshold ? ` (${flow.threshold})` : ""} →{" "}
                    {ACTION_LABEL[flow.actionType]}
                    {flow.actionPoints ? ` (+${flow.actionPoints})` : ""} ·{" "}
                    {flow.runCount}× ausgeführt
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => toggle(flow.id, !flow.isActive)}>
                      {flow.isActive ? "Pause" : "Aktiv"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(flow.id)}>
                      ✕
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
