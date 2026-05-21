import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransportationForm, ExistingDetail } from "@/components/transportation/transportation-form";
import { DevTransportPanel } from "@/components/transportation/dev-transport-panel";
import { format } from "date-fns";

const isDev = process.env.NODE_ENV === "development";

export default async function TransportationPage({
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
      name: true,
      organizers: { select: { userId: true } },
      members: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          transportationDetail: true,
        },
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  const myMember = trip.members.find((m) => m.userId === session.user.id);
  if (!isOrganizer && !myMember) notFound();

  const myDetail = myMember?.transportationDetail ?? null;

  const existing: ExistingDetail | null = myDetail
    ? {
        travelMode: myDetail.travelMode as "FLYING" | "DRIVING",
        arrivalAirport: myDetail.arrivalAirport,
        departureSameAsArrival: myDetail.departureSameAsArrival,
        departureAirport: myDetail.departureAirport,
        arrivalTime: myDetail.arrivalTime,
        departureTime: myDetail.departureTime,
        rentingCar: myDetail.rentingCar,
        driveRole: myDetail.driveRole as "DRIVER" | "PASSENGER" | null,
        driveArrivalTime: myDetail.driveArrivalTime,
        driveDepartureTime: myDetail.driveDepartureTime,
        confirmedPassengers: myDetail.confirmedPassengers,
        extraSeats: myDetail.extraSeats,
        driverTripMemberId: myDetail.driverTripMemberId,
        comments: myDetail.comments,
      }
    : null;

  // Drivers: members with driveRole = DRIVER
  const drivers = trip.members
    .filter((m) => m.transportationDetail?.driveRole === "DRIVER")
    .map((m) => ({
      tripMemberId: m.id,
      name: m.user.name ?? m.user.email,
    }));

  // Name lookup for passenger → driver resolution in the summary table
  const memberNameById = new Map(
    trip.members.map((m) => [m.id, m.user.name ?? m.user.email])
  );

  // Organizer view: summary table of all submitted details
  const submittedCount = trip.members.filter((m) => m.transportationDetail).length;
  const totalMembers = trip.members.length;

  // Sort members for the overview: flyers (can rent) → flyers (can't rent) → drivers+their passengers → unassigned passengers → no detail
  type TripMember = (typeof trip.members)[0];
  const withDetail = trip.members.filter((m) => m.transportationDetail);
  const noDetailMembers = trip.members.filter((m) => !m.transportationDetail);
  const flyersCanRent = withDetail.filter((m) => m.transportationDetail!.travelMode === "FLYING" && m.transportationDetail!.rentingCar === true);
  const flyersCantRent = withDetail.filter((m) => m.transportationDetail!.travelMode === "FLYING" && m.transportationDetail!.rentingCar !== true);
  const driverMembersForSort = withDetail.filter((m) => m.transportationDetail!.driveRole === "DRIVER");
  const allPassengersForSort = withDetail.filter((m) => m.transportationDetail!.driveRole === "PASSENGER");
  const groupedPassengerIds = new Set<string>();
  const sortedMembers: TripMember[] = [
    ...flyersCanRent,
    ...flyersCantRent,
    ...driverMembersForSort.flatMap((driver) => {
      const driverPassengers = allPassengersForSort.filter(
        (p) => p.transportationDetail!.driverTripMemberId === driver.id
      );
      driverPassengers.forEach((p) => groupedPassengerIds.add(p.id));
      return [driver, ...driverPassengers];
    }),
    ...allPassengersForSort.filter((p) => !groupedPassengerIds.has(p.id)),
    ...noDetailMembers,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Transportation</h2>
        {isOrganizer && (
          <p className="text-sm text-muted-foreground">
            {submittedCount} of {totalMembers} members have submitted their details
          </p>
        )}
      </div>

      {/* My form (only if I'm a member) */}
      {myMember && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {existing ? "Your travel details" : "Enter your travel details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransportationForm
              key={existing ? `${existing.travelMode}-${existing.driveRole ?? ""}-${existing.arrivalTime?.toISOString() ?? ""}-${existing.driveArrivalTime?.toISOString() ?? ""}` : "empty"}
              tripId={trip.id}
              existing={existing}
              drivers={drivers}
            />
          </CardContent>
        </Card>
      )}

      {/* Dev panel */}
      {isDev && isOrganizer && (
        <DevTransportPanel tripId={trip.id} memberCount={totalMembers} />
      )}

      {/* Organizer summary */}
      {isOrganizer && trip.members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedMembers.map((m) => {
                const d = m.transportationDetail;
                const isGrouped = groupedPassengerIds.has(m.id);
                return (
                  <div key={m.id} className={`flex items-start justify-between text-sm border-b last:border-0 pb-2 last:pb-0${isGrouped ? " pl-4" : ""}`}>
                    <span className={isGrouped ? "text-muted-foreground" : "font-medium"}>
                      {isGrouped ? "└ " : ""}{m.user.name ?? m.user.email}
                    </span>
                    {d ? (
                      <div className="text-right text-xs space-y-0.5">
                        {d.travelMode === "FLYING" ? (
                          <>
                            <p className={`${d.rentingCar ? "text-blue-600" : "text-violet-600"} font-medium`}>Flying · {d.arrivalAirport}</p>
                            {d.arrivalTime && <p className="text-muted-foreground">Arrives {format(d.arrivalTime, "MMM d, h:mm a")}</p>}
                            {d.departureTime && (
                              <p className="text-muted-foreground">
                                Departs {format(d.departureTime, "MMM d, h:mm a")}
                                {!d.departureSameAsArrival && d.departureAirport ? ` · ${d.departureAirport}` : ""}
                              </p>
                            )}
                            {d.rentingCar && <p className="text-muted-foreground">Able to rent a car</p>}
                          </>
                        ) : (
                          <>
                            <p className={d.driveRole === "DRIVER" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                              {d.driveRole === "DRIVER"
                                ? `Driving - ${d.extraSeats ?? 0} extra seat${(d.extraSeats ?? 0) !== 1 ? "s" : ""}`
                                : (() => {
                                    const driverName = d.driverTripMemberId
                                      ? memberNameById.get(d.driverTripMemberId)
                                      : null;
                                    return driverName
                                      ? `Driving · Passenger in ${driverName}'s car`
                                      : "Driving · Passenger Unassigned";
                                  })()}
                            </p>
                            {d.driveRole === "DRIVER" && d.driveArrivalTime && (
                              <p className="text-muted-foreground">Arrives {format(d.driveArrivalTime, "MMM d, h:mm a")}</p>
                            )}
                            {d.driveRole === "DRIVER" && d.driveDepartureTime && (
                              <p className="text-muted-foreground">Departs {format(d.driveDepartureTime, "MMM d, h:mm a")}</p>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not submitted</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
