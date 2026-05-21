"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "@/server/actions/expenses";
import { Trash2 } from "lucide-react";

export function DeleteExpenseButton({
  tripId,
  expenseId,
}: {
  tripId: string;
  expenseId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete?</span>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteExpense(tripId, expenseId);
            })
          }
        >
          {isPending ? "Deleting..." : "Yes"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setConfirming(false)}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
