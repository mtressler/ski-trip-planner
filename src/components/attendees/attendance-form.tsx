"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitAttendanceConfirmation } from "@/server/actions/members";

type State = { error?: string; success?: boolean } | undefined;

interface AttendanceFormProps {
  tripId: string;
  tripSlug: string;
  tripStartDate: string;
  tripEndDate: string;
  depositFloor: number | null;
  depositBed: number | null;
  defaultSleepingPreference: string;
}

export function AttendanceForm({
  tripId,
  tripSlug,
  tripStartDate,
  tripEndDate,
  depositFloor,
  depositBed,
  defaultSleepingPreference,
}: AttendanceFormProps) {
  const router = useRouter();
  const action = submitAttendanceConfirmation.bind(null, tripId);
  const [state, formAction, isPending] = useActionState<State, FormData>(action, undefined);
  const [fullTrip, setFullTrip] = useState(true);

  if (state?.success) {
    router.push(`/trips/${tripSlug}`);
    return null;
  }

  const depositAmount =
    defaultSleepingPreference === "BED" ? depositBed : depositFloor;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Trip attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Are you attending the full trip?</Label>
            <div className="flex gap-4">
              {([["yes", "Full trip"], ["no", "Partial dates"]] as const).map(
                ([val, label]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fullTrip"
                      value={val}
                      checked={fullTrip === (val === "yes")}
                      onChange={() => setFullTrip(val === "yes")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                )
              )}
            </div>
          </div>

          {!fullTrip && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="tripArrivalDate">Arrival Date</Label>
                <Input
                  id="tripArrivalDate"
                  name="tripArrivalDate"
                  type="date"
                  min={tripStartDate}
                  max={tripEndDate}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tripDepartureDate">Departure Date</Label>
                <Input
                  id="tripDepartureDate"
                  name="tripDepartureDate"
                  type="date"
                  min={tripStartDate}
                  max={tripEndDate}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="depositConfirmedBySelf"
              className="h-4 w-4 mt-0.5 accent-primary"
            />
            <span className="text-sm">
              I confirm that I have paid my deposit
              {depositAmount ? ` ($${depositAmount})` : ""}.
            </span>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            If you haven&apos;t paid yet, you can still submit and update this later.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Complete Registration"}
        </Button>
      </div>
    </form>
  );
}
