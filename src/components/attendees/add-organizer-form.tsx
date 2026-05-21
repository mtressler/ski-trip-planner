"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addOrganizer } from "@/server/actions/organizers";

type State = { error?: string; success?: string } | undefined;

export function AddOrganizerForm({ tripId }: { tripId: string }) {
  const action = addOrganizer.bind(null, tripId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex gap-2 items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="org-email" className="text-sm">Add by email</Label>
        <Input
          id="org-email"
          name="email"
          type="email"
          placeholder="organizer@example.com"
          className="h-8 text-sm"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding..." : "Add"}
      </Button>
      {state?.error && (
        <p className="text-sm text-destructive self-end">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 self-end">{state.success}</p>
      )}
    </form>
  );
}
