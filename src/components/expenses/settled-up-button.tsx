"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markExpenseSettledUp } from "@/server/actions/expenses";
import { CheckCheck } from "lucide-react";

export function SettledUpButton({
  tripId,
  expenseId,
}: {
  tripId: string;
  expenseId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      className="bg-green-700 hover:bg-green-800 h-7 text-xs"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markExpenseSettledUp(tripId, expenseId);
        })
      }
    >
      <CheckCheck className="h-3.5 w-3.5 mr-1" />
      {isPending ? "Settling..." : "Settled Up"}
    </Button>
  );
}
