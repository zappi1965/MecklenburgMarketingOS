"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/actions/tenant";
import { TOOLS, formatPrice } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [tools, setTools] = useState<string[]>(["loyalty"]);

  function toggleTool(key: string) {
    setTools((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createTenant({ name, tools, inviteEmail });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Store einrichten</CardTitle>
        <CardDescription>
          Lege deinen Store an, wähle Tools (30 Tage gratis testen) und lade
          optional einen Admin ein.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Store-Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Café Sonnenschein"
              required
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tools auswählen</Label>
            <div className="space-y-2">
              {TOOLS.map((tool) => {
                const active = tools.includes(tool.key);
                return (
                  <button
                    type="button"
                    key={tool.key}
                    onClick={() => toggleTool(tool.key)}
                    className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {active && "✓"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{tool.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(tool.priceCents)}/Mon.
                        </span>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {tool.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteEmail">
              Admin einladen{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="kollege@example.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Erstelle Store…" : "Store erstellen"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
