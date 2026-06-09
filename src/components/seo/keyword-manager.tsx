"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addKeyword, deleteKeyword, logRank } from "@/actions/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Keyword {
  id: string;
  keyword: string;
  location: string | null;
  latest: number | null;
  previous: number | null;
}

export function KeywordManager({
  keywords,
  canManage,
}: {
  keywords: Keyword[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rankFor, setRankFor] = useState<string | null>(null);
  const [position, setPosition] = useState("");

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget;
    startTransition(async () => {
      const result = await addKeyword({
        keyword: String(f.get("keyword") ?? ""),
        location: String(f.get("location") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      el.reset();
      router.refresh();
    });
  }

  function submitRank(keywordId: string) {
    const pos = Number(position);
    if (!pos) return;
    startTransition(async () => {
      const result = await logRank({ keywordId, position: pos });
      if (!result.ok) setError(result.error);
      setRankFor(null);
      setPosition("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteKeyword(id);
      router.refresh();
    });
  }

  function trend(k: Keyword) {
    if (k.latest == null || k.previous == null) return null;
    // Lower position is better.
    if (k.latest < k.previous) return <span className="text-green-600">▲</span>;
    if (k.latest > k.previous) return <span className="text-destructive">▼</span>;
    return <span className="text-muted-foreground">→</span>;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="kw">Keyword</Label>
            <Input id="kw" name="keyword" placeholder="friseur rostock" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kw-loc">Ort (optional)</Label>
            <Input id="kw-loc" name="location" placeholder="Rostock" />
          </div>
          <Button type="submit" disabled={isPending}>
            Hinzufügen
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {keywords.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Keywords.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Keyword</th>
                <th className="px-3 py-2 font-medium">Position</th>
                {canManage && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{k.keyword}</p>
                    {k.location && (
                      <p className="text-xs text-muted-foreground">{k.location}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {k.latest != null ? (
                      <span className="inline-flex items-center gap-1">
                        #{k.latest} {trend(k)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right">
                      {rankFor === k.id ? (
                        <span className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            placeholder="#"
                            className="h-8 w-16"
                          />
                          <Button size="sm" disabled={isPending} onClick={() => submitRank(k.id)}>
                            OK
                          </Button>
                        </span>
                      ) : (
                        <span className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setRankFor(k.id); setPosition(""); }}>
                            Rang loggen
                          </Button>
                          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(k.id)}>
                            ✕
                          </Button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
