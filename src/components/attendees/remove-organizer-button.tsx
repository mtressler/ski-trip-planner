"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeOrganizer } from "@/server/actions/organizers";
import { X } from "lucide-react";

export function RemoveOrganizerButton({
  tripId,
  organizerUserId,
  organizerName,
}: {
  tripId: string;
  organizerUserId: string;
  organizerName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Remove ${organizerName} as a co-organizer?`)) return;
    startTransition(async () => {
      await removeOrganizer(tripId, organizerUserId);
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={handleClick}
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
