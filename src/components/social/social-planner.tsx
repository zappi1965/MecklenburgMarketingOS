"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost, markPostPublished, deletePost } from "@/actions/social";
import { SOCIAL_CHANNELS, channelLabel } from "@/lib/social";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Post {
  id: string;
  content: string;
  channels: string[];
  status: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
}

export function SocialPlanner({
  posts,
  canManage,
}: {
  posts: Post[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[]>([]);

  function toggleChannel(key: string) {
    setChannels((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await createPost({
        content: String(f.get("content") ?? ""),
        channels,
        scheduledAt: String(f.get("scheduledAt") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      setChannels([]);
      router.refresh();
    });
  }

  function publish(id: string) {
    startTransition(async () => {
      await markPostPublished(id);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deletePost(id);
      router.refresh();
    });
  }

  const upcoming = posts.filter((p) => p.status !== "published");
  const published = posts.filter((p) => p.status === "published");

  function PostRow({ p }: { p: Post }) {
    return (
      <div className="space-y-1 rounded-md border p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 whitespace-pre-wrap text-sm">{p.content}</p>
          {canManage && (
            <div className="flex shrink-0 gap-1">
              {p.status !== "published" && (
                <Button size="sm" disabled={isPending} onClick={() => publish(p.id)}>
                  Veröffentlicht
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(p.id)}>
                ✕
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {p.channels.map((c) => (
            <span key={c} className="rounded bg-secondary px-1.5 py-0.5">
              {channelLabel(c)}
            </span>
          ))}
          <span>· {p.status}</span>
          {p.scheduledAt && (
            <span>· geplant {new Date(p.scheduledAt).toLocaleString("de-DE")}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuer Post</CardTitle>
            <CardDescription>
              Kanäle wählen, Text schreiben und optional terminieren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="content">Text</Label>
                <textarea
                  id="content"
                  name="content"
                  rows={3}
                  required
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_CHANNELS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleChannel(c.key)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      channels.includes(c.key)
                        ? "border-primary bg-primary/10"
                        : "hover:bg-accent"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Termin (optional)</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isPending}>
                Post planen
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Geplant &amp; Entwürfe</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nichts geplant.</p>
        ) : (
          upcoming.map((p) => <PostRow key={p.id} p={p} />)
        )}
      </div>

      {published.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Veröffentlicht</h2>
          {published.map((p) => (
            <PostRow key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
