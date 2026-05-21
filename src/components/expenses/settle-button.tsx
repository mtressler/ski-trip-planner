"use client";

import { useTransition } from "react";
import { markSplitSettled } from "@/server/actions/expenses";

export function SettleButton({
  splitId,
  settled,
}: {
  splitId: string;
  settled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange() {
    startTransition(async () => {
      await markSplitSettled(splitId, !settled);
    });
  }

  return (
    <input
      type="checkbox"
      checked={settled}
      onChange={handleChange}
      disabled={isPending}
      className="h-4 w-4 accent-primary cursor-pointer"
      title={settled ? "Mark as unsettled" : "Mark as settled"}
    />
  );
}
