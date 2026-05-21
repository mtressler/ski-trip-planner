"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type Member = { userId: string; name: string | null; email: string };

export interface MemberPickerState {
  selected: Set<string>;
  amounts: Record<string, string>;
}

interface MemberPickerProps {
  members: Member[];
  mode: "subset" | "custom";
  state: MemberPickerState;
  onChange: (next: MemberPickerState) => void;
}

export function useMemberPickerState(): [MemberPickerState, (next: MemberPickerState) => void] {
  const [state, setState] = useState<MemberPickerState>({
    selected: new Set(),
    amounts: {},
  });
  return [state, setState];
}

export function MemberPicker({ members, mode, state, onChange }: MemberPickerProps) {
  const { selected, amounts } = state;

  function displayName(m: Member) {
    return m.name ?? m.email;
  }

  function remove(userId: string) {
    const nextSelected = new Set(selected);
    nextSelected.delete(userId);
    const nextAmounts = { ...amounts };
    delete nextAmounts[userId];
    onChange({ selected: nextSelected, amounts: nextAmounts });
  }

  const selectedMembers = members.filter((m) => selected.has(m.userId));

  // Hidden inputs for form submission
  const hiddenInputs =
    mode === "subset"
      ? [...selected].map((uid) => (
          <input key={uid} type="hidden" name={`split_${uid}`} value="on" />
        ))
      : Object.entries(amounts)
          .filter(([, v]) => v && parseFloat(v) > 0)
          .map(([uid, val]) => (
            <input key={uid} type="hidden" name={`custom_${uid}`} value={val} />
          ));

  const pillClass =
    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm bg-background";

  return (
    <div className="space-y-1.5">
      {hiddenInputs}
      <div className="rounded-lg border min-h-[80px] p-2 space-y-1.5">
        {selectedMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground p-1">
            Click a name from the panel on the right to add them.
          </p>
        ) : (
          selectedMembers.map((m) => (
            <div key={m.userId} className={pillClass}>
              <span className="truncate flex-1">{displayName(m)}</span>
              {mode === "custom" && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amounts[m.userId] ?? ""}
                    onChange={(e) =>
                      onChange({
                        selected,
                        amounts: { ...amounts, [m.userId]: e.target.value },
                      })
                    }
                    className="h-6 w-16 text-xs px-1.5"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(m.userId)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface AttendeesPanelProps {
  members: Member[];
  pickerState: MemberPickerState;
  onPickerChange: (next: MemberPickerState) => void;
}

export function AttendeesPanel({ members, pickerState, onPickerChange }: AttendeesPanelProps) {
  const [search, setSearch] = useState("");
  const { selected, amounts } = pickerState;

  function displayName(m: Member) {
    return m.name ?? m.email;
  }

  function add(userId: string) {
    onPickerChange({ selected: new Set([...selected, userId]), amounts });
  }

  const unselected = members.filter((m) => !selected.has(m.userId));
  const filtered = search
    ? unselected.filter((m) => {
        const q = search.toLowerCase();
        return (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      })
    : unselected;

  const pillClass =
    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm bg-background";

  return (
    <div className="flex flex-col border-l w-48 shrink-0">
      <div className="p-4 border-b shrink-0">
        <p className="text-base font-semibold mb-3">Attendees</p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-8 text-sm"
        />
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-1">
            {unselected.length === 0 ? "Everyone added" : "No results"}
          </p>
        ) : (
          filtered.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => add(m.userId)}
              className={`${pillClass} w-full text-left hover:bg-muted/60 transition-colors`}
            >
              <span className="truncate">{displayName(m)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
