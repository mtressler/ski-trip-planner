import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { updateTrip } from "@/server/actions/trip";
import { TripForm } from "@/components/trips/trip-form";
import { LinkButton } from "@/components/link-button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: {
      organizers: { select: { userId: true } },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some(
    (o) => o.userId === session.user.id
  );
  if (!isOrganizer) notFound();

  const updateTripWithId = updateTrip.bind(null, trip.id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <LinkButton href={`/trips/${trip.slug}`} variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </LinkButton>
        <h1 className="text-2xl font-bold">Edit Trip</h1>
      </div>

      <TripForm
        action={updateTripWithId}
        defaultValues={{
          name: trip.name,
          resort: trip.resort,
          state: trip.state ?? undefined,
          country: trip.country,
          resortWebsite: trip.resortWebsite ?? undefined,
          startDate: format(trip.startDate, "yyyy-MM-dd"),
          endDate: format(trip.endDate, "yyyy-MM-dd"),
          description: trip.description ?? undefined,
          visibility: trip.visibility,
          capacityMin: trip.capacityMin ? Number(trip.capacityMin) : null,
          capacityMax: trip.capacityMax ? Number(trip.capacityMax) : null,
          estimatedCostMin: trip.estimatedCostMin
            ? Number(trip.estimatedCostMin)
            : null,
          estimatedCostMax: trip.estimatedCostMax
            ? Number(trip.estimatedCostMax)
            : null,
          depositFloor: trip.depositFloor ? Number(trip.depositFloor) : null,
          depositBed: trip.depositBed ? Number(trip.depositBed) : null,
          costNotes: trip.costNotes ?? undefined,
        }}
        submitLabel="Save Changes"
      />

      {trip.status === "DRAFT" && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this trip and all associated data.
          </p>
          <DeleteTripButton tripId={trip.id} />
        </div>
      )}
    </div>
  );
}
