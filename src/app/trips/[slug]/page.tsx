import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Mountain,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Globe,
  Pencil,
  ExternalLink,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { CopyInviteButton } from "@/components/trips/copy-invite-button";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  INVITING: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const visibilityLabels: Record<string, string> = {
  PRIVATE: "Private",
  LINK_ONLY: "Link Only",
  PUBLIC: "Public",
};

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: {
      organizers: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: {
        select: {
          members: { where: { status: "CONFIRMED" } },
          interestResponses: true,
        },
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some(
    (o) => o.userId === session.user.id
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{trip.name}</h1>
            <Badge variant="secondary" className={statusColors[trip.status]}>
              {trip.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {trip.resort}
            {trip.state && `, ${trip.state}`}
            {trip.country !== "US" && `, ${trip.country}`}
          </p>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            <CopyInviteButton inviteToken={trip.inviteToken} />
            <LinkButton href={`/trips/${trip.slug}/edit`} variant="outline" size="sm">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </LinkButton>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trip</span>
              <span>
                {format(trip.startDate, "MMM d")} –{" "}
                {format(trip.endDate, "MMM d, yyyy")}
              </span>
            </div>
            {trip.inviteDeadline && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invite Deadline</span>
                <span>{format(trip.inviteDeadline, "MMM d, yyyy")}</span>
              </div>
            )}
            {trip.confirmDeadline && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirm Deadline</span>
                <span>{format(trip.confirmDeadline, "MMM d, yyyy")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* People */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              People
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confirmed</span>
              <span>{trip._count.members}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interest Responses</span>
              <span>{trip._count.interestResponses}</span>
            </div>
            {(trip.capacityMin || trip.capacityMax) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity</span>
                <span>
                  {trip.capacityMin && trip.capacityMax
                    ? `${trip.capacityMin}–${trip.capacityMax}`
                    : trip.capacityMax
                      ? `Up to ${trip.capacityMax}`
                      : `At least ${trip.capacityMin}`}
                </span>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-muted-foreground text-xs mb-1">Organizers</p>
              {trip.organizers.map((o) => (
                <span key={o.id} className="text-sm">
                  {o.user.name ?? o.user.email}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(trip.estimatedCostMin || trip.estimatedCostMax) ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Total</span>
                <span>
                  {trip.estimatedCostMin && trip.estimatedCostMax
                    ? `$${Number(trip.estimatedCostMin)}–$${Number(trip.estimatedCostMax)}`
                    : trip.estimatedCostMax
                      ? `Up to $${Number(trip.estimatedCostMax)}`
                      : `From $${Number(trip.estimatedCostMin)}`}
                </span>
              </div>
            ) : null}
            {trip.depositFloor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit (Floor)</span>
                <span>${Number(trip.depositFloor)}</span>
              </div>
            )}
            {trip.depositBed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit (Bed)</span>
                <span>${Number(trip.depositBed)}</span>
              </div>
            )}
            {trip.costNotes && (
              <p className="text-muted-foreground text-xs pt-2 border-t">
                {trip.costNotes}
              </p>
            )}
            {!trip.estimatedCostMin && !trip.estimatedCostMax && !trip.depositFloor && !trip.depositBed && !trip.costNotes && (
              <p className="text-muted-foreground italic">No cost information set.</p>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {trip.resortWebsite && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Resort Website</span>
                <a
                  href={trip.resortWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Visit <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visibility</span>
              <span>{visibilityLabels[trip.visibility]}</span>
            </div>
            {trip.description && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {trip.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
