"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FieldErrors = Record<string, string[] | undefined>;

type ActionState =
  | {
      error?: FieldErrors;
      values?: Record<string, string>;
    }
  | undefined;

interface TripFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name?: string;
    resort?: string;
    state?: string;
    country?: string;
    resortWebsite?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    visibility?: string;
    capacityMin?: number | null;
    capacityMax?: number | null;
    estimatedCostMin?: number | null;
    estimatedCostMax?: number | null;
    depositFloor?: number | null;
    depositBed?: number | null;
    costNotes?: string;
  };
  submitLabel?: string;
}

export function TripForm({
  action,
  defaultValues = {},
  submitLabel = "Create Trip",
}: TripFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const errors = state?.error as FieldErrors | undefined;
  // Use server-returned values (on error) to persist form data
  const v = state?.values;

  const [startDate, setStartDate] = useState(defaultValues.startDate ?? "");
  const [endDate, setEndDate] = useState(defaultValues.endDate ?? "");

  // Sync date state when server returns values after an error
  useEffect(() => {
    if (v?.startDate) setStartDate(v.startDate);
    if (v?.endDate) setEndDate(v.endDate);
  }, [v?.startDate, v?.endDate]);

  const dateError =
    startDate && endDate && endDate <= startDate
      ? "End date must be after start date"
      : null;

  return (
    <form action={formAction} className="space-y-6">
      {/* Basics */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Basics</CardTitle>
          <CardDescription>Name, resort, and dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Trip Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={v?.name ?? defaultValues.name}
              key={`name-${v?.name}`}
              placeholder="e.g. Spring Break Ski Trip 2026"
              required
            />
            <FieldError errors={errors} field="name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resort">Resort *</Label>
              <Input
                id="resort"
                name="resort"
                defaultValue={v?.resort ?? defaultValues.resort}
                key={`resort-${v?.resort}`}
                placeholder="e.g. Breckenridge"
                required
              />
              <FieldError errors={errors} field="resort" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                defaultValue={v?.state ?? defaultValues.state}
                key={`state-${v?.state}`}
                placeholder="e.g. Colorado"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                defaultValue={v?.country ?? defaultValues.country ?? "US"}
                key={`country-${v?.country}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resortWebsite">Resort Website</Label>
              <Input
                id="resortWebsite"
                name="resortWebsite"
                type="text"
                defaultValue={v?.resortWebsite ?? defaultValues.resortWebsite}
                key={`resortWebsite-${v?.resortWebsite}`}
                placeholder="https://..."
              />
              <FieldError errors={errors} field="resortWebsite" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                aria-invalid={!!dateError || undefined}
              />
              <FieldError errors={errors} field="startDate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                aria-invalid={!!dateError || undefined}
              />
              {dateError ? (
                <p className="text-sm text-destructive">{dateError}</p>
              ) : (
                <FieldError errors={errors} field="endDate" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={v?.description ?? defaultValues.description}
              key={`description-${v?.description}`}
              placeholder="Brief description of the trip..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Cost */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity & Cost</CardTitle>
          <CardDescription>
            Optional — set group size and estimated costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacityMin">Min Capacity</Label>
              <Input
                id="capacityMin"
                name="capacityMin"
                type="number"
                min={1}
                defaultValue={v?.capacityMin ?? defaultValues.capacityMin ?? ""}
                key={`capacityMin-${v?.capacityMin}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacityMax">Max Capacity</Label>
              <Input
                id="capacityMax"
                name="capacityMax"
                type="number"
                min={1}
                defaultValue={v?.capacityMax ?? defaultValues.capacityMax ?? ""}
                key={`capacityMax-${v?.capacityMax}`}
              />
              <FieldError errors={errors} field="capacityMax" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCostMin">Est. Cost Min ($)</Label>
              <Input
                id="estimatedCostMin"
                name="estimatedCostMin"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  v?.estimatedCostMin ?? defaultValues.estimatedCostMin ?? ""
                }
                key={`estimatedCostMin-${v?.estimatedCostMin}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCostMax">Est. Cost Max ($)</Label>
              <Input
                id="estimatedCostMax"
                name="estimatedCostMax"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  v?.estimatedCostMax ?? defaultValues.estimatedCostMax ?? ""
                }
                key={`estimatedCostMax-${v?.estimatedCostMax}`}
              />
              <FieldError errors={errors} field="estimatedCostMax" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositFloor">Deposit — Floor ($)</Label>
              <Input
                id="depositFloor"
                name="depositFloor"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  v?.depositFloor ?? defaultValues.depositFloor ?? ""
                }
                key={`depositFloor-${v?.depositFloor}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositBed">Deposit — Bed ($)</Label>
              <Input
                id="depositBed"
                name="depositBed"
                type="number"
                min={0}
                step="0.01"
                defaultValue={v?.depositBed ?? defaultValues.depositBed ?? ""}
                key={`depositBed-${v?.depositBed}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="costNotes">Cost Notes</Label>
            <Textarea
              id="costNotes"
              name="costNotes"
              defaultValue={v?.costNotes ?? defaultValues.costNotes}
              key={`costNotes-${v?.costNotes}`}
              placeholder="Any notes about pricing, what's included, etc."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={
                v?.visibility ?? defaultValues.visibility ?? "LINK_ONLY"
              }
              key={`visibility-${v?.visibility}`}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="PRIVATE">Private — invite only</option>
              <option value="LINK_ONLY">Link Only — anyone with link</option>
              <option value="PUBLIC">Public — listed on site</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending || !!dateError}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldError({
  errors,
  field,
}: {
  errors?: FieldErrors;
  field: string;
}) {
  const messages = errors?.[field];
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages.join(", ")}</p>;
}
