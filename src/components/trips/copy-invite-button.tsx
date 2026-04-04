"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyInviteButton({ inviteToken }: { inviteToken: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${inviteToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy Invite Link
        </>
      )}
    </Button>
  );
}
