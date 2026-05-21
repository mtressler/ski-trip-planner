"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTransportationDetail } from "@/server/actions/transportation";

type ActionState = { error?: Record<string, string[]>; success?: boolean } | undefined;

type Driver = {
  tripMemberId: string;
  name: string;
};

export type ExistingDetail = {
  travelMode: "FLYING" | "DRIVING";
  // Flying
  arrivalAirport?: string | null;
  departureSameAsArrival?: boolean | null;
  departureAirport?: string | null;
  arrivalTime?: Date | null;
  departureTime?: Date | null;
  rentingCar?: boolean | null;
  // Driving
  driveRole?: "DRIVER" | "PASSENGER" | null;
  driveArrivalTime?: Date | null;
  driveDepartureTime?: Date | null;
  confirmedPassengers?: number | null;
  extraSeats?: number | null;
  driverTripMemberId?: string | null;
  // Common
  comments?: string | null;
};

interface TransportationFormProps {
  tripId: string;
  existing: ExistingDetail | null;
  drivers: Driver[];
}

function toDatetimeLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const selectClass = "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TransportationForm({ tripId, existing, drivers }: TransportationFormProps) {
  const action = saveTransportationDetail.bind(null, tripId);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, undefined);

  const [travelMode, setTravelMode] = useState<"FLYING" | "DRIVING">(
    existing?.travelMode ?? "FLYING"
  );
  const [driveRole, setDriveRole] = useState<"DRIVER" | "PASSENGER">(
    existing?.driveRole ?? "DRIVER"
  );
  const [departureSameAsArrival, setDepartureSameAsArrival] = useState(
    existing?.departureSameAsArrival ?? true
  );

  const isFlying = travelMode === "FLYING";
  const isDrivingDriver = travelMode === "DRIVING" && driveRole === "DRIVER";
  const isDrivingPassenger = travelMode === "DRIVING" && driveRole === "PASSENGER";

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        Transportation details saved successfully.{" "}
        <button
          className="underline font-medium"
          onClick={() => window.location.reload()}
        >
          Edit again
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error?._form && (
        <p className="text-sm text-destructive">{state.error._form.join(", ")}</p>
      )}

      {/* Travel mode */}
      <div className="space-y-1.5">
        <Label>How are you getting there?</Label>
        <div className="flex gap-3">
          {(["FLYING", "DRIVING"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="travelMode"
                value={mode}
                checked={travelMode === mode}
                onChange={() => setTravelMode(mode)}
                className="accent-primary"
              />
              {mode === "FLYING" ? "Flying" : "Driving"}
            </label>
          ))}
        </div>
      </div>

      {/* FLYING fields */}
      {isFlying && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="arrivalAirport">Arrival airport *</Label>
            <Input
              id="arrivalAirport"
              name="arrivalAirport"
              placeholder="e.g. SLC, DEN"
              defaultValue={existing?.arrivalAirport ?? ""}
              required
            />
            {state?.error?.arrivalAirport && (
              <p className="text-xs text-destructive">{state.error.arrivalAirport.join(", ")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                name="departureSameAsArrival"
                value="true"
                checked={departureSameAsArrival}
                onChange={(e) => setDepartureSameAsArrival(e.target.checked)}
                className="accent-primary"
              />
              My departure airport is the same as my arrival airport
            </label>
            {!departureSameAsArrival && (
              <input type="hidden" name="departureSameAsArrival" value="false" />
            )}
            {departureSameAsArrival && (
              <input type="hidden" name="departureSameAsArrival" value="true" />
            )}
          </div>

          {!departureSameAsArrival && (
            <div className="space-y-1.5">
              <Label htmlFor="departureAirport">Departure airport *</Label>
              <Input
                id="departureAirport"
                name="departureAirport"
                placeholder="e.g. LAX"
                defaultValue={existing?.departureAirport ?? ""}
                required
              />
              {state?.error?.departureAirport && (
                <p className="text-xs text-destructive">{state.error.departureAirport.join(", ")}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="arrivalTime">Arrival time *</Label>
              <input
                type="datetime-local"
                id="arrivalTime"
                name="arrivalTime"
                defaultValue={toDatetimeLocal(existing?.arrivalTime)}
                required
                className={inputClass}
              />
              {state?.error?.arrivalTime && (
                <p className="text-xs text-destructive">{state.error.arrivalTime.join(", ")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departureTime">Departure time *</Label>
              <input
                type="datetime-local"
                id="departureTime"
                name="departureTime"
                defaultValue={toDatetimeLocal(existing?.departureTime)}
                required
                className={inputClass}
              />
              {state?.error?.departureTime && (
                <p className="text-xs text-destructive">{state.error.departureTime.join(", ")}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Are you able to rent a car? *</Label>
            <div className="flex gap-4">
              {[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="rentingCar"
                    value={opt.value}
                    defaultChecked={
                      existing?.rentingCar != null
                        ? String(existing.rentingCar) === opt.value
                        : opt.value === "false"
                    }
                    className="accent-primary"
                    required
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* DRIVING fields */}
      {!isFlying && (
        <>
          <div className="space-y-1.5">
            <Label>Your role *</Label>
            <div className="flex gap-4">
              {(["DRIVER", "PASSENGER"] as const).map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="driveRole"
                    value={role}
                    checked={driveRole === role}
                    onChange={() => setDriveRole(role)}
                    className="accent-primary"
                  />
                  {role === "DRIVER" ? "Driver" : "Passenger"}
                </label>
              ))}
            </div>
          </div>

          {isDrivingDriver && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="driveArrivalTime">Arrival time *</Label>
                  <input
                    type="datetime-local"
                    id="driveArrivalTime"
                    name="driveArrivalTime"
                    defaultValue={toDatetimeLocal(existing?.driveArrivalTime)}
                    required
                    className={inputClass}
                  />
                  {state?.error?.driveArrivalTime && (
                    <p className="text-xs text-destructive">{state.error.driveArrivalTime.join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driveDepartureTime">Departure time *</Label>
                  <input
                    type="datetime-local"
                    id="driveDepartureTime"
                    name="driveDepartureTime"
                    defaultValue={toDatetimeLocal(existing?.driveDepartureTime)}
                    required
                    className={inputClass}
                  />
                  {state?.error?.driveDepartureTime && (
                    <p className="text-xs text-destructive">{state.error.driveDepartureTime.join(", ")}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="confirmedPassengers">Passengers in your car</Label>
                  <Input
                    id="confirmedPassengers"
                    name="confirmedPassengers"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={existing?.confirmedPassengers ?? 0}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">People already committed to riding with you</p>
                  {state?.error?.confirmedPassengers && (
                    <p className="text-xs text-destructive">{state.error.confirmedPassengers.join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="extraSeats">Extra seats available</Label>
                  <Input
                    id="extraSeats"
                    name="extraSeats"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={existing?.extraSeats ?? 0}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">Open seats beyond those passengers</p>
                  {state?.error?.extraSeats && (
                    <p className="text-xs text-destructive">{state.error.extraSeats.join(", ")}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {isDrivingPassenger && drivers.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="driverTripMemberId">Your driver (optional)</Label>
              <select
                id="driverTripMemberId"
                name="driverTripMemberId"
                defaultValue={existing?.driverTripMemberId ?? ""}
                className={selectClass}
              >
                <option value="">Unknown / undecided</option>
                {drivers.map((d) => (
                  <option key={d.tripMemberId} value={d.tripMemberId}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* Comments — common to all modes */}
      <div className="space-y-1.5">
        <Label htmlFor="comments">Comments (optional)</Label>
        <Textarea
          id="comments"
          name="comments"
          rows={2}
          defaultValue={existing?.comments ?? ""}
          placeholder="Anything else the organizer should know..."
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : existing ? "Update Details" : "Save Details"}
      </Button>
    </form>
  );
}
