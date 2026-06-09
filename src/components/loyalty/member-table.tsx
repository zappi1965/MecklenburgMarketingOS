"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustPoints } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Member {
  id: string;
  displayName: string | null;
  email: string | null;
  pointsBalance: number;
  createdAt: Date;
}

export function MemberTable({
  members,
  canOperate,
}: {
  members: Member[];
  canOperate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [delta, setDelta] = useState("");

  function submit(memberId: string) {
    const points = Number(delta);
    if (!points) return;
    setError(null);
    startTransition(async () => {
      const result = await adjustPoints({ memberId, points });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(null);
      setDelta("");
      router.refresh();
    });
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Noch keine Mitglieder.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Mitglied</th>
              <th className="px-3 py-2 font-medium">Seit</th>
              <th className="px-3 py-2 text-right font-medium">Punkte</th>
              {canOperate && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.displayName ?? m.email ?? `#${m.id.slice(0, 8)}`}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString("de-DE")}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {m.pointsBalance}
                </td>
                {canOperate && (
                  <td className="px-3 py-2 text-right">
                    {editing === m.id ? (
                      <span className="flex items-center justify-end gap-1">
                        <Input
                          value={delta}
                          onChange={(e) => setDelta(e.target.value)}
                          type="number"
                          placeholder="±"
                          className="h-8 w-20"
                        />
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => submit(m.id)}
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          ✕
                        </Button>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(m.id);
                          setDelta("");
                        }}
                      >
                        Punkte ±
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
