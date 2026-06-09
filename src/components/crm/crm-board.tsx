"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createContact,
  deleteContact,
  createDeal,
  updateDealStage,
  deleteDeal,
} from "@/actions/crm";
import { formatPrice } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STAGES = [
  { key: "new", label: "Neu" },
  { key: "qualified", label: "Qualifiziert" },
  { key: "proposal", label: "Angebot" },
  { key: "won", label: "Gewonnen" },
  { key: "lost", label: "Verloren" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}
interface Deal {
  id: string;
  title: string;
  valueCents: number | null;
  stage: string;
  contactName: string | null;
}

export function CrmBoard({
  contacts,
  deals,
  canManage,
}: {
  contacts: Contact[];
  deals: Deal[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createContact({
        name: String(f.get("name") ?? ""),
        email: String(f.get("email") ?? ""),
        phone: String(f.get("phone") ?? ""),
        company: String(f.get("company") ?? ""),
        source: String(f.get("source") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function addDeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createDeal({
        title: String(f.get("title") ?? ""),
        contactId: String(f.get("contactId") ?? ""),
        valueEuros: f.get("value") ? Number(f.get("value")) : undefined,
        stage: "new",
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function moveDeal(id: string, stage: Stage) {
    startTransition(async () => {
      await updateDealStage(id, stage);
      router.refresh();
    });
  }

  function removeDeal(id: string) {
    startTransition(async () => {
      await deleteDeal(id);
      router.refresh();
    });
  }

  function removeContact(id: string) {
    startTransition(async () => {
      await deleteContact(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Pipeline */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Pipeline</h2>
        {canManage && (
          <form onSubmit={addDeal} className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="deal-title">Deal</Label>
              <Input id="deal-title" name="title" placeholder="Catering-Auftrag" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-contact">Kontakt</Label>
              <select
                id="deal-contact"
                name="contactId"
                className="flex h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">— ohne —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-value">Wert (€)</Label>
              <Input id="deal-value" name="value" type="number" min={0} className="w-28" />
            </div>
            <Button type="submit" disabled={isPending}>
              Deal anlegen
            </Button>
          </form>
        )}

        <div className="grid gap-3 md:grid-cols-5">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const sum = stageDeals.reduce((s, d) => s + (d.valueCents ?? 0), 0);
            return (
              <div key={stage.key} className="rounded-lg border bg-muted/20 p-2">
                <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium">
                  <span>{stage.label}</span>
                  <span className="text-muted-foreground">{stageDeals.length}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((d) => (
                    <div key={d.id} className="rounded-md border bg-background p-2 text-sm">
                      <p className="font-medium">{d.title}</p>
                      {d.contactName && (
                        <p className="text-xs text-muted-foreground">{d.contactName}</p>
                      )}
                      {d.valueCents != null && (
                        <p className="text-xs">{formatPrice(d.valueCents)}</p>
                      )}
                      {canManage && (
                        <div className="mt-1 flex items-center gap-1">
                          <select
                            value={d.stage}
                            onChange={(e) => moveDeal(d.id, e.target.value as Stage)}
                            disabled={isPending}
                            className="h-7 flex-1 rounded border border-input bg-background text-xs"
                          >
                            {STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeDeal(d.id)}
                            disabled={isPending}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {sum > 0 && (
                  <p className="mt-2 px-1 text-xs text-muted-foreground">
                    Σ {formatPrice(sum)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontakte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <form onSubmit={addContact} className="grid gap-2 sm:grid-cols-2">
              <Input name="name" placeholder="Name" required />
              <Input name="email" type="email" placeholder="E-Mail" />
              <Input name="phone" placeholder="Telefon" />
              <Input name="company" placeholder="Firma" />
              <Input name="source" placeholder="Quelle (z. B. Messe)" />
              <Button type="submit" disabled={isPending}>
                Kontakt anlegen
              </Button>
            </form>
          )}

          <div className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Kontakte.</p>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[c.company, c.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {canManage && (
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => removeContact(c.id)}>
                      ✕
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
