"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/actions/tenant";
import { ASSIGNABLE_ROLES } from "@/lib/auth/rbac";
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

type Role = (typeof ASSIGNABLE_ROLES)[number];

interface Member {
  membershipId: string;
  userId: string;
  role: Role;
  email: string;
  fullName: string | null;
}

interface TeamManagerProps {
  members: Member[];
  currentUserId: string;
  canInvite: boolean;
  canUpdateRole: boolean;
  canRemove: boolean;
}

export function TeamManager({
  members,
  currentUserId,
  canInvite,
  canUpdateRole,
  canRemove,
}: TeamManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteMember({ email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      router.refresh();
    });
  }

  function handleRoleChange(membershipId: string, nextRole: Role) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole({ membershipId, role: nextRole });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function handleRemove(membershipId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeMember({ membershipId });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mitglied einladen</CardTitle>
            <CardDescription>
              Die Person erhält eine E-Mail-Einladung.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleInvite}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">E-Mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Rolle</Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isPending}>
                Einladen
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mitglieder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div
              key={m.membershipId}
              className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.fullName ?? m.email}
                  {m.userId === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (du)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canUpdateRole ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(m.membershipId, e.target.value as Role)
                    }
                    disabled={isPending}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs">
                    {m.role}
                  </span>
                )}
                {canRemove && m.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRemove(m.membershipId)}
                  >
                    Entfernen
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
