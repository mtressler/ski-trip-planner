"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { editExpense } from "@/server/actions/expenses";
import {
  MemberPicker,
  AttendeesPanel,
  MemberPickerState,
} from "@/components/expenses/member-picker";

type Member = { userId: string; name: string | null; email: string };
type State = { error?: Record<string, string[]>; values?: Record<string, string>; success?: boolean } | undefined;

const categoryOptions = [
  { value: "LODGING", label: "Lodging" },
  { value: "LIFT_TICKETS", label: "Lift Tickets" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "FOOD", label: "Food" },
  { value: "EQUIPMENT_RENTAL", label: "Equipment Rental" },
  { value: "MISC", label: "Misc" },
];

export interface ExpenseForEdit {
  id: string;
  description: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  category: string;
  notes: string | null;
  paidById: string;
  splits: { userId: string; share: number }[];
}

interface EditExpenseDialogProps {
  tripId: string;
  expense: ExpenseForEdit;
  members: Member[];
  currentUserId: string;
}

function detectSplitType(splits: { userId: string; share: number }[], members: Member[]): string {
  if (splits.length === 0) return "EQUAL_ALL";
  const memberIds = new Set(members.map((m) => m.userId));
  const activeSplits = splits.filter((s) => memberIds.has(s.userId));
  if (activeSplits.length === 0) return "EQUAL_ALL";
  const shares = activeSplits.map((s) => s.share);
  const avg = shares.reduce((a, b) => a + b, 0) / shares.length;
  const allEqual = shares.every((s) => Math.abs(s - avg) <= 0.01);
  if (allEqual && activeSplits.length === members.length) return "EQUAL_ALL";
  if (allEqual) return "EQUAL_SUBSET";
  return "CUSTOM";
}

function initPickerState(splits: { userId: string; share: number }[], members: Member[]): MemberPickerState {
  const memberIds = new Set(members.map((m) => m.userId));
  const activeSplits = splits.filter((s) => memberIds.has(s.userId));
  return {
    selected: new Set(activeSplits.map((s) => s.userId)),
    amounts: Object.fromEntries(activeSplits.map((s) => [s.userId, s.share.toFixed(2)])),
  };
}

export function EditExpenseDialog({ tripId, expense, members, currentUserId }: EditExpenseDialogProps) {
  const action = editExpense.bind(null, tripId, expense.id);
  const [state, formAction, isPending] = useActionState<State, FormData>(action, undefined);

  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [splitType, setSplitType] = useState(() => detectSplitType(expense.splits, members));
  const [pickerState, setPickerState] = useState<MemberPickerState>(() =>
    initPickerState(expense.splits, members)
  );
  const [selfPrompt, setSelfPrompt] = useState<"subset" | "custom" | "custom-added" | null>(null);
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const skipSelfCheck = useRef(false);
  const pendingSubmit = useRef(false);

  const showPanel = splitType === "EQUAL_SUBSET" || splitType === "CUSTOM";

  // Close on success — useEffect so stale success doesn't re-close on next open
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  // After pickerState updates for EQUAL_SUBSET "add me" case, auto-submit
  useEffect(() => {
    if (pendingSubmit.current) {
      pendingSubmit.current = false;
      skipSelfCheck.current = true;
      formRef.current?.requestSubmit();
    }
  });

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      // Reset all state to the current expense values each time the dialog opens
      setSplitType(detectSplitType(expense.splits, members));
      setPickerState(initPickerState(expense.splits, members));
      setSelfPrompt(null);
      setCustomAmountError(null);
      skipSelfCheck.current = false;
      pendingSubmit.current = false;
      setFormKey((k) => k + 1); // remounts form so uncontrolled inputs reset
    }
    setOpen(isOpen);
  }

  function isCurrentUserInSplit() {
    if (splitType === "EQUAL_ALL") return true;
    return pickerState.selected.has(currentUserId);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (skipSelfCheck.current) {
      skipSelfCheck.current = false;
      return;
    }

    const form = e.currentTarget;
    const markChecked = (form.elements.namedItem("markMySharePaid") as HTMLInputElement)?.checked;
    if (markChecked && !isCurrentUserInSplit()) {
      e.preventDefault();
      setSelfPrompt(splitType === "EQUAL_SUBSET" ? "subset" : "custom");
      return;
    }

    if (splitType === "CUSTOM") {
      const totalAmount = parseFloat((form.elements.namedItem("amount") as HTMLInputElement)?.value ?? "0");
      const selected = [...pickerState.selected];

      const missingAmount = selected.some((uid) => {
        const val = pickerState.amounts[uid];
        return !val || parseFloat(val) <= 0;
      });
      if (missingAmount) {
        e.preventDefault();
        setCustomAmountError("All selected members must have an amount greater than 0.");
        return;
      }

      const customTotal = selected.reduce((sum, uid) => sum + parseFloat(pickerState.amounts[uid] ?? "0"), 0);
      const diff = Math.abs(customTotal - totalAmount);
      if (diff > 0.01) {
        e.preventDefault();
        setCustomAmountError(
          `Custom amounts total $${customTotal.toFixed(2)} but the expense is $${totalAmount.toFixed(2)}. They must match.`
        );
        return;
      }

      setCustomAmountError(null);
    }
  }

  function handleAddSelf() {
    const nextSelected = new Set([...pickerState.selected, currentUserId]);
    setPickerState({ selected: nextSelected, amounts: pickerState.amounts });
    setSelfPrompt(null);
    if (selfPrompt === "subset") {
      pendingSubmit.current = true;
    } else if (selfPrompt === "custom") {
      setSelfPrompt("custom-added");
    }
  }

  function handleSkipSelf() {
    setSelfPrompt(null);
    skipSelfCheck.current = true;
    formRef.current?.requestSubmit();
  }

  const selectClass =
    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DialogContent
        className={
          showPanel
            ? "p-0 overflow-hidden sm:max-w-2xl max-h-[90vh] flex flex-row items-stretch"
            : "sm:max-w-md overflow-y-auto max-h-[90vh]"
        }
        showCloseButton={!showPanel}
      >
        <div className={showPanel ? "flex-1 overflow-y-auto p-4" : ""}>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>

          <form key={formKey} ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4 mt-2">
            {state?.error?._form && (
              <p className="text-sm text-destructive">{state.error._form.join(", ")}</p>
            )}

            {selfPrompt && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                {selfPrompt === "custom-added" ? (
                  <p className="text-amber-700 text-xs">
                    You&apos;ve been added — enter your share amount below, then submit.
                  </p>
                ) : (
                  <>
                    <p className="font-medium text-amber-800 mb-1">You&apos;re not included in this split.</p>
                    <p className="text-amber-700 text-xs mb-3">Would you like to add yourself?</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddSelf}>
                        Yes, add me
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={handleSkipSelf}>
                        No, continue without me
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                name="description"
                defaultValue={state?.values?.description ?? expense.description}
                required
              />
              {state?.error?.description && (
                <p className="text-xs text-destructive">{state.error.description.join(", ")}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">Amount ($) *</Label>
                <Input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={state?.values?.amount ?? expense.amount.toFixed(2)}
                  placeholder="0.00"
                  required
                />
                {state?.error?.amount && (
                  <p className="text-xs text-destructive">{state.error.amount.join(", ")}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  name="date"
                  type="date"
                  defaultValue={state?.values?.date ?? expense.date}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                name="category"
                defaultValue={state?.values?.category ?? expense.category}
                className={selectClass}
              >
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Split</Label>
              <select
                name="splitType"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
                className={selectClass}
              >
                <option value="EQUAL_ALL">Split equally among all</option>
                <option value="EQUAL_SUBSET">Split equally among some</option>
                <option value="CUSTOM">Custom amounts</option>
              </select>
            </div>

            {showPanel && (
              <>
                <MemberPicker
                  key={splitType}
                  members={members}
                  mode={splitType === "EQUAL_SUBSET" ? "subset" : "custom"}
                  state={pickerState}
                  onChange={(next) => {
                    setPickerState(next);
                    if (splitType === "CUSTOM") setCustomAmountError(null);
                  }}
                />
                {customAmountError && (
                  <p className="text-xs text-destructive">{customAmountError}</p>
                )}
              </>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-markMySharePaid"
                name="markMySharePaid"
                defaultChecked
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="edit-markMySharePaid" className="font-normal cursor-pointer">
                Mark my share as already paid
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                name="notes"
                rows={2}
                defaultValue={state?.values?.notes ?? (expense.notes ?? "")}
                placeholder="Receipt details, notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>

        {showPanel && (
          <AttendeesPanel
            members={members}
            pickerState={pickerState}
            onPickerChange={setPickerState}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
