"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Read-only code block with a copy-to-clipboard button. */
export function CopyBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; selection still works.
    }
  }

  return (
    <div className="space-y-2">
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
        <code>{content}</code>
      </pre>
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? "Kopiert ✓" : "Kopieren"}
      </Button>
    </div>
  );
}
