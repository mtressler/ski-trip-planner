"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { launchTrip } from "@/server/actions/trip";
import { Rocket } from "lucide-react";

export function LaunchTripButton({ tripId }: { tripId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Launch this trip? This opens it for invitations and cannot be undone.")) return;
    startTransition(async () => {
      await launchTrip(tripId);
    });
  }

  return (
    <Button disabled={isPending} onClick={handleClick}>
      <Rocket className="mr-1.5 h-4 w-4" />
      {isPending ? "Launching..." : "Launch Trip"}
    </Button>
  );
}
