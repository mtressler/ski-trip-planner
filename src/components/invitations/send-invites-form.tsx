"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

type ActionState =
  | { error?: string; success?: string; duplicates?: string[] }
  | undefined;

interface SendInvitesFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}

export function SendInvitesForm({ action }: SendInvitesFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {state.success}
          {state.duplicates && (
            <p className="mt-1 text-xs">
              Already invited: {state.duplicates.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="emails">Email Addresses</Label>
        <Textarea
          id="emails"
          name="emails"
          placeholder="Enter email addresses separated by commas or new lines..."
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Paste a comma-separated or newline-separated list of emails.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customMessage">Custom Message (optional)</Label>
        <Textarea
          id="customMessage"
          name="customMessage"
          placeholder="Add a personal note to the invitation..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        <Send className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? "Sending..." : "Send Invitations"}
      </Button>
    </form>
  );
}
