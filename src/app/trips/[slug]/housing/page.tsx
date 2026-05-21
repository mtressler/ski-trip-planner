import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { HousingBoard, type HouseData, type MemberSplit } from "@/components/housing/housing-board";

export default async function HousingPage({
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
      status: true,
      selectedHouseId: true,
      depositFloor: true,
      depositBed: true,
      organizers: { select: { userId: true } },
      members: {
        where: { status: "CONFIRMED" },
        select: {
          id: true,
          userId: true,
          sleepingPreference: true,
          depositAmount: true,
          depositConfirmedBySelf: true,
          user: { select: { name: true, email: true } },
        },
      },
      potentialHouses: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  if (!isOrganizer) notFound();

  const houses: HouseData[] = trip.potentialHouses.map((h) => ({
    id: h.id,
    listingUrl: h.listingUrl,
    price: Number(h.price),
    bedSpots: h.bedSpots,
    floorSpots: h.floorSpots,
    pricePerBedSpot: h.pricePerBedSpot != null ? Number(h.pricePerBedSpot) : null,
    pricePerFloorSpot: h.pricePerFloorSpot != null ? Number(h.pricePerFloorSpot) : null,
  }));

  const selectedHouse = trip.selectedHouseId
    ? trip.potentialHouses.find((h) => h.id === trip.selectedHouseId)
    : null;

  // Build preview splits for the selected house
  const memberSplits: MemberSplit[] = selectedHouse
    ? trip.members.map((m) => {
        const isBed = m.sleepingPreference === "BED";
        const spotPrice = isBed
          ? Number(selectedHouse.pricePerBedSpot ?? 0)
          : Number(selectedHouse.pricePerFloorSpot ?? 0);
        const depositLevel = isBed
          ? Number(trip.depositBed ?? 0)
          : Number(trip.depositFloor ?? 0);
        const memberDeposit = m.depositAmount != null ? Number(m.depositAmount) : depositLevel;
        const net = Math.max(0, spotPrice - memberDeposit);
        return {
          name: m.user.name ?? m.user.email,
          sleepingPreference: m.sleepingPreference,
          spotPrice,
          deposit: memberDeposit,
          net,
        };
      })
    : [];

  const hasExistingHouseExpense = await prisma.expense
    .findFirst({
      where: { tripId: trip.id, category: "LODGING", description: { startsWith: "House Expense" } },
    })
    .then((e) => e != null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">House Tracker</h2>
        <p className="text-sm text-muted-foreground">
          Add and compare potential lodging listings. Select one to mark it as chosen.
        </p>
      </div>

      <HousingBoard
        tripId={trip.id}
        slug={slug}
        houses={houses}
        selectedHouseId={trip.selectedHouseId}
        memberSplits={memberSplits}
        hasExistingHouseExpense={hasExistingHouseExpense}
      />
    </div>
  );
}
