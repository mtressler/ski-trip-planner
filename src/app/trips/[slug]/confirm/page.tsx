import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mountain } from "lucide-react";
import { AttendanceForm } from "@/components/attendees/attendance-form";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      resort: true,
      state: true,
      startDate: true,
      endDate: true,
      depositFloor: true,
      depositBed: true,
    },
  });

  if (!trip) notFound();

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: session.user.id } },
    select: {
      id: true,
      status: true,
      fullTripAttendance: true,
      depositConfirmedBySelf: true,
      sleepingPreference: true,
    },
  });

  if (!member || member.status !== "CONFIRMED") {
    // Not a confirmed member — redirect to trip page and let it handle access
    redirect(`/trips/${slug}`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Trip summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5" />
            {trip.name}
          </CardTitle>
          <CardDescription>
            {trip.resort}
            {trip.state && `, ${trip.state}`}
            {" · "}
            {format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Welcome! Fill out the quick form below to complete your registration.
          </p>
        </CardContent>
      </Card>

      <AttendanceForm
        tripId={trip.id}
        tripSlug={trip.slug}
        tripStartDate={format(trip.startDate, "yyyy-MM-dd")}
        tripEndDate={format(trip.endDate, "yyyy-MM-dd")}
        depositFloor={trip.depositFloor ? Number(trip.depositFloor) : null}
        depositBed={trip.depositBed ? Number(trip.depositBed) : null}
        defaultSleepingPreference={member.sleepingPreference}
      />
    </div>
  );
}
