import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mountain } from "lucide-react";
import { format } from "date-fns";

export default async function PastTripsPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const trips = await prisma.trip.findMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
      OR: [
        { organizers: { some: { userId } } },
        { members: { some: { userId, status: "CONFIRMED" } } },
      ],
    },
    include: {
      _count: { select: { members: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { endDate: "desc" },
  });

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Past Trips</h1>
        <p className="text-muted-foreground">A record of all completed and cancelled trips.</p>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mountain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No past trips yet</h3>
            <p className="text-muted-foreground">
              Completed and cancelled trips will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.slug}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{trip.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={
                        trip.status === "COMPLETED"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {trip.status}
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
                    <span>{trip._count.members} attended</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
