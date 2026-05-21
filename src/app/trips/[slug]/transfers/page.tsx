import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { TransferBoard, MemberCard, CarGroupData, AssignmentData } from "@/components/transfers/transfer-board";

export default async function TransfersPage({
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
      organizers: { select: { userId: true } },
      members: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          transportationDetail: true,
          transferAssignments: true,
        },
      },
      transferGroups: {
        orderBy: { createdAt: "asc" },
      },
      transferAssignments: true,
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  if (!isOrganizer) notFound();

  // Auto-create and sync car groups for all drivers
  const newGroups: typeof trip.transferGroups = [];
  const driverMembers = trip.members.filter(
    (m) => m.transportationDetail?.driveRole === "DRIVER"
  );
  for (const direction of ["TO_LODGING", "TO_AIRPORT"] as const) {
    for (const driver of driverMembers) {
      const d = driver.transportationDetail!;
      const expectedCapacity = 1 + (d.confirmedPassengers ?? 0) + (d.extraSeats ?? 0);
      const allSoFar = [...trip.transferGroups, ...newGroups];
      const existingGroup = allSoFar.find(
        (g) => g.driverId === driver.id && g.direction === direction
      );
      if (!existingGroup) {
        const d2 = driver.transportationDetail!;
        const carType = d2.travelMode === "FLYING" ? "rental" : "personal";
        const driverDisplayName = driver.user.name ?? driver.user.email;
        const group = await prisma.transferGroup.create({
          data: {
            tripId: trip.id,
            direction,
            name: `${driverDisplayName}'s ${carType} car`,
            driverId: driver.id,
            maxCapacity: expectedCapacity,
          },
        });
        newGroups.push(group);
      } else if (existingGroup.maxCapacity !== expectedCapacity) {
        await prisma.transferGroup.update({
          where: { id: existingGroup.id },
          data: { maxCapacity: expectedCapacity },
        });
        existingGroup.maxCapacity = expectedCapacity;
      }
    }
  }
  const allTransferGroups = [...trip.transferGroups, ...newGroups];

  // Build a name lookup for driver resolution
  const memberNameById = new Map(
    trip.members.map((m) => [m.id, m.user.name ?? m.user.email])
  );

  // Auto-assign drivers and passengers who don't yet have assignments
  const existingAssignmentKeys = new Set(
    trip.transferAssignments.map((a) => `${a.tripMemberId}:${a.direction}`)
  );
  const newAssignments: AssignmentData[] = [];

  // Drivers first — assign them to their own car group
  for (const direction of ["TO_LODGING", "TO_AIRPORT"] as const) {
    const unassignedDrivers = trip.members.filter((m) => {
      if (m.transportationDetail?.driveRole !== "DRIVER") return false;
      return !existingAssignmentKeys.has(`${m.id}:${direction}`);
    });
    for (const driver of unassignedDrivers) {
      const driverGroup = allTransferGroups.find(
        (g) => g.driverId === driver.id && g.direction === direction
      );
      if (!driverGroup) continue;
      await prisma.transferAssignment.create({
        data: {
          tripId: trip.id,
          tripMemberId: driver.id,
          direction,
          type: "CAR_GROUP",
          transferGroupId: driverGroup.id,
          assignedBy: session.user.id!,
        },
      });
      existingAssignmentKeys.add(`${driver.id}:${direction}`);
      newAssignments.push({ tripMemberId: driver.id, direction, type: "CAR_GROUP", transferGroupId: driverGroup.id });
    }
  }

  // Passengers — assign to their driver's car group
  for (const direction of ["TO_LODGING", "TO_AIRPORT"] as const) {
    const unassignedPassengers = trip.members.filter((m) => {
      if (m.transportationDetail?.driveRole !== "PASSENGER") return false;
      if (!m.transportationDetail.driverTripMemberId) return false;
      return !existingAssignmentKeys.has(`${m.id}:${direction}`);
    });

    for (const passenger of unassignedPassengers) {
      const driverTripMemberId = passenger.transportationDetail!.driverTripMemberId!;
      const driverGroup = allTransferGroups.find(
        (g) => g.driverId === driverTripMemberId && g.direction === direction
      );
      if (!driverGroup) continue;

      await prisma.transferAssignment.create({
        data: {
          tripId: trip.id,
          tripMemberId: passenger.id,
          direction,
          type: "CAR_GROUP",
          transferGroupId: driverGroup.id,
          assignedBy: session.user.id!,
        },
      });
      existingAssignmentKeys.add(`${passenger.id}:${direction}`);
      newAssignments.push({
        tripMemberId: passenger.id,
        direction,
        type: "CAR_GROUP",
        transferGroupId: driverGroup.id,
      });
    }
  }

  const members: MemberCard[] = trip.members.map((m) => {
    const d = m.transportationDetail;
    const driverTripMemberId = d?.driverTripMemberId ?? null;
    return {
      tripMemberId: m.id,
      userId: m.userId,
      name: m.user.name ?? m.user.email,
      travelMode: d ? (d.travelMode as "FLYING" | "DRIVING") : null,
      driveRole: d ? (d.driveRole as "DRIVER" | "PASSENGER" | null) : null,
      rentingCar: d?.rentingCar ?? null,
      arrivalAirport: d?.arrivalAirport ?? null,
      departureAirport: d?.departureAirport ?? null,
      departureSameAsArrival: d?.departureSameAsArrival ?? null,
      arrivalTime: d?.arrivalTime ?? null,
      departureTime: d?.departureTime ?? null,
      driveArrivalTime: d?.driveArrivalTime ?? null,
      driveDepartureTime: d?.driveDepartureTime ?? null,
      driverName: driverTripMemberId ? (memberNameById.get(driverTripMemberId) ?? null) : null,
    };
  });

  const carGroups: CarGroupData[] = allTransferGroups.map((g) => ({
    id: g.id,
    direction: g.direction as "TO_LODGING" | "TO_AIRPORT",
    name: g.name,
    maxCapacity: g.maxCapacity,
    driverId: g.driverId,
  }));

  const assignments: AssignmentData[] = [
    ...trip.transferAssignments.map((a) => ({
      tripMemberId: a.tripMemberId,
      direction: a.direction as "TO_LODGING" | "TO_AIRPORT",
      type: a.type as "CAR_GROUP" | "OWN" | "SHUTTLE",
      transferGroupId: a.transferGroupId,
    })),
    ...newAssignments,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Transfer Groups</h2>
        <p className="text-sm text-muted-foreground">
          Assign confirmed members to car groups or buckets for airport transfers.
          Drag and drop participants between groups.
        </p>
      </div>

      <TransferBoard
        slug={slug}
        members={members}
        carGroups={carGroups}
        assignments={assignments}
      />
    </div>
  );
}
