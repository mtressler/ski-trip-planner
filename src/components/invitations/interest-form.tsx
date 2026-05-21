"use client";

import { useActionState, useEffect, useState } from "react";
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

type FieldErrors = Record<string, string[] | undefined>;
type ActionState =
  | { error?: FieldErrors; values?: Record<string, string> }
  | undefined;

interface InterestFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  invitedEmail?: string | null;
  defaultValues?: {
    name: string;
    email: string;
    phone: string | null;
    status: string;
    guestCount: number;
    rentalNeeds: string;
    skillLevel: string;
    skiDays: number;
    travelMode: string;
    schoolYear: string;
    schoolYearOther: string | null;
    sleepingPreference: string;
    comments: string | null;
  } | null;
}

const statusToInterest: Record<string, string> = {
  INTERESTED: "INTERESTED",
  PENDING: "PENDING",
  NOT_INTERESTED: "NOT_INTERESTED",
};

export function InterestForm({ action, defaultValues, invitedEmail }: InterestFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const errors = state?.error as FieldErrors | undefined;
  const v = state?.values;

  const [schoolYear, setSchoolYear] = useState(
    defaultValues?.schoolYear ?? "FRESHMAN"
  );
  const [guestCount, setGuestCount] = useState(
    String(defaultValues?.guestCount ?? 1)
  );

  useEffect(() => {
    if (v?.schoolYear) setSchoolYear(v.schoolYear);
  }, [v?.schoolYear]);

  useEffect(() => {
    if (v?.guestCount) setGuestCount(v.guestCount);
  }, [v?.guestCount]);

  const dv = defaultValues;

  return (
    <form action={formAction} className="space-y-6">
      {errors?._form && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {errors._form.join(", ")}
        </div>
      )}

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={v?.name ?? dv?.name}
                key={`name-${v?.name}`}
                required
              />
              <FieldError errors={errors} field="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={v?.email ?? dv?.email ?? invitedEmail ?? ""}
                key={`email-${v?.email ?? invitedEmail}`}
                required
              />
              <FieldError errors={errors} field="email" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={v?.phone ?? dv?.phone ?? ""}
              key={`phone-${v?.phone}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interest Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Are you interested?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            ["INTERESTED", "Yes, I'm in!"],
            ["PENDING", "Maybe, tell me more"],
            ["NOT_INTERESTED", "I can't make it"],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="interestLevel"
                value={value}
                defaultChecked={
                  (v?.interestLevel ?? statusToInterest[dv?.status ?? ""] ?? "") === value
                }
                key={`interest-${v?.interestLevel}`}
                className="h-4 w-4 accent-primary"
                required
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
          <FieldError errors={errors} field="interestLevel" />
        </CardContent>
      </Card>

      {/* Trip Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestCount">Party Size (including you)</Label>
              <Input
                id="guestCount"
                name="guestCount"
                type="number"
                min={1}
                max={20}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
              <FieldError errors={errors} field="guestCount" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skiDays">Number of Ski Days</Label>
              <Input
                id="skiDays"
                name="skiDays"
                type="number"
                min={0}
                max={14}
                defaultValue={v?.skiDays ?? dv?.skiDays ?? 0}
                key={`skiDays-${v?.skiDays}`}
              />
              <FieldError errors={errors} field="skiDays" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentalNeeds">Rental Needs</Label>
              <select
                id="rentalNeeds"
                name="rentalNeeds"
                defaultValue={v?.rentalNeeds ?? dv?.rentalNeeds ?? "NONE"}
                key={`rental-${v?.rentalNeeds}`}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="NONE">None</option>
                <option value="SKIS">Skis</option>
                <option value="SNOWBOARD">Snowboard</option>
                <option value="BOOTS">Boots</option>
                <option value="FULL_PACKAGE">Full Package</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skillLevel">Skill Level</Label>
              <select
                id="skillLevel"
                name="skillLevel"
                defaultValue={v?.skillLevel ?? dv?.skillLevel ?? "BEGINNER"}
                key={`skill-${v?.skillLevel}`}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Travel Mode</Label>
              <div className="flex gap-4 pt-1">
                {(["DRIVING", "FLYING"] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="travelMode"
                      value={mode}
                      defaultChecked={
                        (v?.travelMode ?? dv?.travelMode ?? "DRIVING") === mode
                      }
                      key={`travel-${v?.travelMode}`}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">
                      {mode === "DRIVING" ? "Drive" : "Fly"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sleeping Preference</Label>
              <div className="flex gap-4 pt-1">
                {(["FLOOR", "BED"] as const).map((pref) => (
                  <label key={pref} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sleepingPreference"
                      value={pref}
                      defaultChecked={
                        (v?.sleepingPreference ?? dv?.sleepingPreference ?? "FLOOR") === pref
                      }
                      key={`sleep-${v?.sleepingPreference}`}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">{pref === "FLOOR" ? "Floor" : "Bed"}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolYear">School Year</Label>
            <select
              id="schoolYear"
              name="schoolYear"
              value={v?.schoolYear ?? schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="FRESHMAN">Freshman</option>
              <option value="SOPHOMORE">Sophomore</option>
              <option value="JUNIOR">Junior</option>
              <option value="SENIOR">Senior</option>
              <option value="ALUM">Alum</option>
              <option value="OTHER">Other</option>
            </select>
            {(v?.schoolYear ?? schoolYear) === "OTHER" && (
              <div className="mt-2">
                <Input
                  id="schoolYearOther"
                  name="schoolYearOther"
                  placeholder="Please specify..."
                  defaultValue={v?.schoolYearOther ?? dv?.schoolYearOther ?? ""}
                  key={`schoolYearOther-${v?.schoolYearOther}`}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anything Else?</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="comments"
            name="comments"
            defaultValue={v?.comments ?? dv?.comments ?? ""}
            key={`comments-${v?.comments}`}
            placeholder="Questions, comments, dietary restrictions..."
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Submitting..."
            : defaultValues
              ? "Update Response"
              : "Submit"}
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
