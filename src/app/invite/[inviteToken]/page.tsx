import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, MapPin, Mountain } from "lucide-react";
import { InterestForm } from "@/components/invitations/interest-form";
import { submitInterestResponse } from "@/server/actions/interest-response";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { inviteToken } = await params;
  const { ref: editToken } = await searchParams;

  const trip = await prisma.trip.findUnique({
    where: { inviteToken },
    select: {
      id: true,
      name: true,
      resort: true,
      state: true,
      startDate: true,
      endDate: true,
      description: true,
      inviteDeadline: true,
      inviteToken: true,
    },
  });

  if (!trip) notFound();

  // Check deadline
  const isPastDeadline = trip.inviteDeadline && new Date() > trip.inviteDeadline;

  // Load existing response if editToken provided
  let existingResponse = null;
  let invitedEmail: string | null = null;
  if (editToken) {
    const found = await prisma.interestResponse.findUnique({
      where: { editToken },
      select: {
        name: true,
        email: true,
        phone: true,
        status: true,
        guestCount: true,
        rentalNeeds: true,
        skillLevel: true,
        skiDays: true,
        travelMode: true,
        schoolYear: true,
        schoolYearOther: true,
        sleepingPreference: true,
        comments: true,
      },
    });
    if (found) {
      invitedEmail = found.email;
      // Only treat as pre-filled if the form was actually submitted (name is set)
      if (found.name) existingResponse = found;
    }
  }

  const action = submitInterestResponse.bind(null, inviteToken, editToken ?? null);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      {/* Trip Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5" />
            {trip.name}
          </CardTitle>
          <CardDescription className="space-y-1">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {trip.resort}
              {trip.state && `, ${trip.state}`}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(trip.startDate, "MMM d")} –{" "}
              {format(trip.endDate, "MMM d, yyyy")}
            </span>
          </CardDescription>
        </CardHeader>
        {trip.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {trip.description}
            </p>
          </CardContent>
        )}
      </Card>

      {isPastDeadline ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold mb-2">Submissions Closed</p>
            <p className="text-muted-foreground">
              The deadline for this trip has passed. Contact the organizer if you
              have questions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">
            {existingResponse ? "Update Your Response" : "Let Us Know You're Interested"}
          </h2>
          <InterestForm action={action} defaultValues={existingResponse} invitedEmail={invitedEmail} />
        </>
      )}
    </div>
  );
}
