import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TripInfoForm } from "@/components/trip-info/trip-info-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TripInfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      tripInfo: true,
      organizers: { select: { userId: true } },
      members: session?.user?.id
        ? {
            where: { userId: session.user.id, status: "CONFIRMED" },
            select: { id: true },
          }
        : undefined,
    },
  });

  if (!trip) notFound();

  const isOrganizer =
    session?.user?.id && trip.organizers.some((o) => o.userId === session.user!.id);
  const isMember =
    session?.user?.id && trip.members && trip.members.length > 0;

  // Only organizers and confirmed members can view this page
  if (!isOrganizer && !isMember) notFound();

  return (
    <div className="space-y-6">
      {isOrganizer ? (
        <>
          <div>
            <h2 className="text-xl font-semibold">Trip Info</h2>
            <p className="text-sm text-muted-foreground">
              Share important details with your group. Markdown is supported.
            </p>
          </div>
          <TripInfoForm tripId={trip.id} defaultValue={trip.tripInfo} />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trip Info</CardTitle>
            {!trip.tripInfo && (
              <CardDescription>
                The organizer hasn&apos;t added any trip info yet.
              </CardDescription>
            )}
          </CardHeader>
          {trip.tripInfo && (
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                {trip.tripInfo}
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
