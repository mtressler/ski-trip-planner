"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveTripInfo } from "@/server/actions/trip-info";

type State = { error?: string; success?: boolean } | undefined;

export function TripInfoForm({
  tripId,
  defaultValue,
}: {
  tripId: string;
  defaultValue: string | null;
}) {
  const action = saveTripInfo.bind(null, tripId);
  const [state, formAction, isPending] = useActionState<State, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700">Saved.</p>
      )}
      <Textarea
        name="tripInfo"
        defaultValue={defaultValue ?? ""}
        placeholder="Share logistics, packing lists, house rules, local tips... Markdown is supported."
        rows={16}
        className="font-mono text-sm"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
