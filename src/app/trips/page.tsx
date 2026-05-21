import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain } from "lucide-react";
import { format } from "date-fns";

export default async function PublicTripsPage() {
  const trips = await prisma.trip.findMany({
    where: {
      visibility: "PUBLIC",
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: {
      _count: {
        select: {
          interestResponses: {
            where: { status: { in: ["INTERESTED", "CONFIRMED"] } },
          },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Open Trips</h1>
        <p className="text-muted-foreground">Public trips open for interest.</p>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mountain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No public trips right now</h3>
            <p className="text-muted-foreground">Check back later for upcoming trips.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/invite/${trip.inviteToken}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{trip.name}</CardTitle>
                  <CardDescription>{trip.resort}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      {format(trip.startDate, "MMM d")} –{" "}
                      {format(trip.endDate, "MMM d, yyyy")}
                    </span>
                    {trip.estimatedCostMin && trip.estimatedCostMax && (
                      <span>
                        ${Number(trip.estimatedCostMin).toFixed(0)}–${Number(trip.estimatedCostMax).toFixed(0)} est.
                      </span>
                    )}
                    <span>{trip._count.interestResponses} interested</span>
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
