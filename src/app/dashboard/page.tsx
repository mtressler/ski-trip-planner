import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mountain } from "lucide-react";
import { format } from "date-fns";
import { Suspense } from "react";
import { SortSelector } from "@/components/dashboard/sort-selector";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  INVITING: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

type OrderBy =
  | { createdAt: "asc" | "desc" }
  | { name: "asc" | "desc" }
  | { resort: "asc" | "desc" };

function parseSort(sort: string | undefined): OrderBy {
  switch (sort) {
    case "name_asc":    return { name: "asc" };
    case "name_desc":   return { name: "desc" };
    case "resort_asc":  return { resort: "asc" };
    case "resort_desc": return { resort: "desc" };
    default:            return { createdAt: "desc" };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await requireAuth();
  const userId = session.user.id;
  const { sort } = await searchParams;
  const orderBy = parseSort(sort);

  const [organizedTrips, memberTrips] = await Promise.all([
    prisma.trip.findMany({
      where: {
        organizers: { some: { userId } },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        _count: { select: { members: { where: { status: "CONFIRMED" } } } },
      },
      orderBy,
    }),
    prisma.trip.findMany({
      where: {
        members: { some: { userId, status: "CONFIRMED" } },
        organizers: { none: { userId } },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        _count: { select: { members: { where: { status: "CONFIRMED" } } } },
      },
      orderBy,
    }),
  ]);

  const allTrips = [...organizedTrips, ...memberTrips];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name ?? "traveler"}
          </p>
        </div>
        <LinkButton href="/trips/new">
          <Plus className="mr-2 h-4 w-4" />
          New Trip
        </LinkButton>
      </div>

      {allTrips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mountain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No trips yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first trip or wait for an invite.
            </p>
            <LinkButton href="/trips/new">Create a Trip</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {organizedTrips.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Trips You Organize</h2>
                {allTrips.length > 1 && (
                  <Suspense>
                    <SortSelector />
                  </Suspense>
                )}
              </div>
              <div className="grid gap-4">
                {organizedTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}

          {memberTrips.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Trips You&apos;re On</h2>
              <div className="grid gap-4">
                {memberTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TripCard({
  trip,
}: {
  trip: {
    id: string;
    slug: string;
    name: string;
    resort: string;
    status: string;
    startDate: Date;
    endDate: Date;
    _count: { members: number };
  };
}) {
  return (
    <Link href={`/trips/${trip.slug}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{trip.name}</CardTitle>
            <Badge variant="secondary" className={statusColors[trip.status]}>
              {trip.status.replace("_", " ")}
            </Badge>
          </div>
          <CardDescription>{trip.resort}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {format(trip.startDate, "MMM d")} –{" "}
              {format(trip.endDate, "MMM d, yyyy")}
            </span>
            <span>{trip._count.members} confirmed</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
