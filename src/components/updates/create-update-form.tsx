"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createUpdate } from "@/server/actions/updates";

type State = { error?: Record<string, string[]>; values?: Record<string, string>; success?: boolean } | undefined;

export function CreateUpdateForm({
  tripId,
  memberCount,
}: {
  tripId: string;
  memberCount: number;
}) {
  const action = createUpdate.bind(null, tripId);
  const [state, formAction, isPending] = useActionState<State, FormData>(action, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Post an Update</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          {state?.error?._form && (
            <p className="text-sm text-destructive">{state.error._form.join(", ")}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-700">Update posted!</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={state?.success ? "" : state?.values?.title}
              key={state?.success ? "reset" : "form"}
              placeholder="Packing list, schedule change..."
              required
            />
            {state?.error?.title && (
              <p className="text-xs text-destructive">{state.error.title.join(", ")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              name="body"
              defaultValue={state?.success ? "" : state?.values?.body}
              key={state?.success ? "reset-body" : "form-body"}
              rows={4}
              placeholder="Write your update..."
              required
            />
            {state?.error?.body && (
              <p className="text-xs text-destructive">{state.error.body.join(", ")}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" name="pinned" className="h-4 w-4 accent-primary" />
                Pin to top
              </label>
              {memberCount > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="sendEmail" className="h-4 w-4 accent-primary" />
                  Email {memberCount} member{memberCount !== 1 ? "s" : ""}
                </label>
              )}
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
