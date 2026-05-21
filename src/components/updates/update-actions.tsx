"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteUpdate, togglePinUpdate } from "@/server/actions/updates";
import { Pin, PinOff, Trash2 } from "lucide-react";

export function PinButton({
  tripId,
  updateId,
  pinned,
}: {
  tripId: string;
  updateId: string;
  pinned: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
      disabled={isPending}
      onClick={() => startTransition(async () => { await togglePinUpdate(tripId, updateId); })}
      title={pinned ? "Unpin" : "Pin to top"}
    >
      {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function DeleteUpdateButton({
  tripId,
  updateId,
}: {
  tripId: string;
  updateId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this update?")) return;
        startTransition(async () => { await deleteUpdate(tripId, updateId); });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
