"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { withdrawMember, removeMember } from "@/server/actions/members";
import { UserMinus, Trash2 } from "lucide-react";

export function WithdrawButton({
  tripId,
  memberId,
  memberName,
}: {
  tripId: string;
  memberId: string;
  memberName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Withdraw ${memberName} from this trip?`)) return;
    startTransition(async () => {
      await withdrawMember(tripId, memberId);
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs text-muted-foreground hover:text-foreground"
      disabled={isPending}
      onClick={handleClick}
    >
      <UserMinus className="h-3.5 w-3.5 mr-1" />
      {isPending ? "..." : "Withdraw"}
    </Button>
  );
}

export function RemoveButton({
  tripId,
  memberId,
  memberName,
}: {
  tripId: string;
  memberId: string;
  memberName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Remove ${memberName} from this trip? This cannot be undone.`)) return;
    startTransition(async () => {
      await removeMember(tripId, memberId);
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs text-destructive hover:text-destructive"
      disabled={isPending}
      onClick={handleClick}
    >
      <Trash2 className="h-3.5 w-3.5 mr-1" />
      {isPending ? "..." : "Remove"}
    </Button>
  );
}
