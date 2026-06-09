"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertBioPage,
  addBioLink,
  deleteBioLink,
  setBioLinkActive,
} from "@/actions/bio";
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

interface BioLink {
  id: string;
  label: string;
  url: string;
  clickCount: number;
  isActive: boolean;
}

export function BioAdmin({
  page,
  links,
  publicUrl,
  canManage,
}: {
  page: { title: string; bioText: string | null; themeColor: string } | null;
  links: BioLink[];
  publicUrl: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function savePage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertBioPage({
        title: String(f.get("title") ?? ""),
        bioText: String(f.get("bioText") ?? ""),
        themeColor: String(f.get("themeColor") ?? "#1d4ed8"),
      });
      if (!result.ok) return setError(result.error);
      setMessage("Gespeichert.");
      router.refresh();
    });
  }

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await addBioLink({
        label: String(f.get("label") ?? ""),
        url: String(f.get("url") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function toggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await setBioLinkActive(id, isActive);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteBioLink(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Öffentliche Seite</CardTitle>
          <CardDescription>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {publicUrl}
            </a>
          </CardDescription>
        </CardHeader>
        {canManage && (
          <CardContent>
            <form onSubmit={savePage} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" name="title" defaultValue={page?.title ?? "Meine Links"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bioText">Beschreibung</Label>
                <Input id="bioText" name="bioText" defaultValue={page?.bioText ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="themeColor">Farbe</Label>
                <input
                  id="themeColor"
                  name="themeColor"
                  type="color"
                  defaultValue={page?.themeColor ?? "#1d4ed8"}
                  className="h-10 w-16 rounded-md border border-input"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && (
                <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
              )}
              <Button type="submit" disabled={isPending}>
                Seite speichern
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <form onSubmit={add} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" name="label" placeholder="Instagram" required />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" required />
              </div>
              <Button type="submit" disabled={isPending}>
                Hinzufügen
              </Button>
            </form>
          )}

          <div className="space-y-2">
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Links.</p>
            ) : (
              links.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center justify-between gap-2 rounded-md border p-2 text-sm ${
                    l.isActive ? "" : "opacity-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {l.clickCount} Klicks
                    </span>
                    {canManage && (
                      <>
                        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => toggle(l.id, !l.isActive)}>
                          {l.isActive ? "Aus" : "An"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(l.id)}>
                          ✕
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
