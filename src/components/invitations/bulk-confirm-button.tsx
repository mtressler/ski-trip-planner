"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { bulkConfirmAll } from "@/server/actions/members";
import { Users } from "lucide-react";

export function BulkConfirmButton({ tripId }: { tripId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await bulkConfirmAll(tripId);
      setResult(res);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        className="bg-green-700 hover:bg-green-800"
      >
        <Users className="h-4 w-4 mr-1.5" />
        {isPending ? "Confirming..." : "Confirm All Interested"}
      </Button>
      {result?.success && (
        <span className="text-sm text-green-700">{result.success}</span>
      )}
      {result?.error && (
        <span className="text-sm text-destructive">{result.error}</span>
      )}
    </div>
  );
}
