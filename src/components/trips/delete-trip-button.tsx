"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTrip } from "@/server/actions/trip";
import { Trash2 } from "lucide-react";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete Trip
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(async () => { await deleteTrip(tripId); })}
      >
        {isPending ? "Deleting..." : "Yes, delete"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
