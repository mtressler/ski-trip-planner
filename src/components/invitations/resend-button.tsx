"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { resendInvitation } from "@/server/actions/invitation";
import { toast } from "sonner";

export function ResendButton({
  tripId,
  responseId,
}: {
  tripId: string;
  responseId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendInvitation(tripId, responseId);
          if (result.error) toast.error(result.error);
          else if (result.success) toast.success(result.success);
        })
      }
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
    </Button>
  );
}
