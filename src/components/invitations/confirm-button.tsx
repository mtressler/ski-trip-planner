"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmMember } from "@/server/actions/members";
import { CheckCircle } from "lucide-react";

export function ConfirmButton({
  tripId,
  responseId,
}: {
  tripId: string;
  responseId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await confirmMember(tripId, responseId);
      if (result.error) setMessage(result.error);
      else setMessage(null);
    });
  }

  if (message) {
    return <span className="text-xs text-destructive">{message}</span>;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
      disabled={isPending}
      onClick={handleClick}
    >
      <CheckCircle className="h-3.5 w-3.5 mr-1" />
      {isPending ? "Confirming..." : "Confirm"}
    </Button>
  );
}
