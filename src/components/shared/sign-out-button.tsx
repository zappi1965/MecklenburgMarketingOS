"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Abmelden</span>
    </Button>
  );
}
