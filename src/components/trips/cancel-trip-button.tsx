"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelTrip } from "@/server/actions/trip";
import { XCircle } from "lucide-react";

export function CancelTripButton({ tripId }: { tripId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
        <XCircle className="mr-1.5 h-3.5 w-3.5" />
        Cancel Trip
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          This will notify all members. Are you sure?
        </span>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelTrip(tripId);
              if (result?.error) {
                setError(result.error);
                setConfirming(false);
              }
            })
          }
        >
          {isPending ? "Cancelling..." : "Yes, cancel trip"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Never mind
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
