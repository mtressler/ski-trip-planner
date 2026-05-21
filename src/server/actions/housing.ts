"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { z } from "zod";

const houseSchema = z.object({
  listingUrl: z.string().url("Must be a valid URL"),
  price: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().positive("Total price must be greater than 0")
  ),
  bedSpots: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0, "Bed spots cannot be negative")
  ),
  floorSpots: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0, "Floor spots cannot be negative")
  ),
  pricePerBedSpot: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  pricePerFloorSpot: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().positive().optional()
  ),
});

async function requireTripOrganizer(tripId: string) {
  const session = await requireAuth();
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) throw new Error("Not authorized");
  return session;
}

export async function addHouse(
  tripId: string,
  _prevState: { error?: Record<string, string[] | undefined> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: { _form: ["Not authorized"] } };

  const raw = Object.fromEntries(formData.entries());
  const parsed = houseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { slug: true } });
  if (!trip) return { error: { _form: ["Trip not found"] } };

  await prisma.potentialHouse.create({
    data: {
      tripId,
      addedById: session.user.id,
      listingUrl: parsed.data.listingUrl,
      price: parsed.data.price,
      bedSpots: parsed.data.bedSpots,
      floorSpots: parsed.data.floorSpots,
      pricePerBedSpot: parsed.data.pricePerBedSpot ?? null,
      pricePerFloorSpot: parsed.data.pricePerFloorSpot ?? null,
    },
  });

  revalidatePath(`/trips/${trip.slug}/housing`);
  return { success: true };
}

export async function updateHouse(
  houseId: string,
  tripSlug: string,
  _prevState: { error?: Record<string, string[] | undefined> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();
  const house = await prisma.potentialHouse.findUnique({
    where: { id: houseId },
    select: { tripId: true },
  });
  if (!house) return { error: { _form: ["House not found"] } };
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId: house.tripId, userId: session.user.id },
  });
  if (!organizer) return { error: { _form: ["Not authorized"] } };

  const raw = Object.fromEntries(formData.entries());
  const parsed = houseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.potentialHouse.update({
    where: { id: houseId },
    data: {
      listingUrl: parsed.data.listingUrl,
      price: parsed.data.price,
      bedSpots: parsed.data.bedSpots,
      floorSpots: parsed.data.floorSpots,
      pricePerBedSpot: parsed.data.pricePerBedSpot ?? null,
      pricePerFloorSpot: parsed.data.pricePerFloorSpot ?? null,
    },
  });

  revalidatePath(`/trips/${tripSlug}/housing`);
  return { success: true };
}

export async function deleteHouse(houseId: string) {
  const session = await requireAuth();
  const house = await prisma.potentialHouse.findUnique({
    where: { id: houseId },
    select: { tripId: true },
  });
  if (!house) return { error: "House not found" };
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId: house.tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const trip = await prisma.trip.findUnique({
    where: { id: house.tripId },
    select: { slug: true, selectedHouseId: true },
  });
  if (!trip) return { error: "Trip not found" };

  // Clear selection if this was the selected house
  if (trip.selectedHouseId === houseId) {
    await prisma.trip.update({
      where: { id: house.tripId },
      data: { selectedHouseId: null },
    });
  }

  await prisma.potentialHouse.delete({ where: { id: houseId } });

  revalidatePath(`/trips/${trip.slug}/housing`);
  return { success: true };
}

export async function selectHouse(houseId: string | null, tripId: string) {
  const session = await requireAuth();
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { selectedHouseId: houseId },
    select: { slug: true },
  });

  revalidatePath(`/trips/${trip.slug}/housing`);
  return { success: true };
}

export async function generateHouseExpense(tripId: string) {
  const session = await requireAuth();
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      slug: true,
      selectedHouseId: true,
      depositFloor: true,
      depositBed: true,
      members: {
        where: { status: "CONFIRMED" },
        select: {
          id: true,
          userId: true,
          sleepingPreference: true,
          depositAmount: true,
          depositConfirmedBySelf: true,
        },
      },
    },
  });
  if (!trip) return { error: "Trip not found" };
  if (!trip.selectedHouseId) return { error: "No house selected" };

  const house = await prisma.potentialHouse.findUnique({
    where: { id: trip.selectedHouseId },
  });
  if (!house) return { error: "Selected house not found" };
  if (!house.pricePerBedSpot && !house.pricePerFloorSpot) {
    return { error: "Set per-spot prices on the selected house before generating an expense" };
  }

  // Delete any existing house expense for this trip
  const existingExpense = await prisma.expense.findFirst({
    where: { tripId, category: "LODGING", description: { startsWith: "House Expense" } },
  });
  if (existingExpense) {
    await prisma.expense.delete({ where: { id: existingExpense.id } });
  }

  // Build splits
  let total = 0;
  const splits: { userId: string; share: number }[] = [];

  for (const member of trip.members) {
    const isBed = member.sleepingPreference === "BED";
    const spotPrice = isBed
      ? Number(house.pricePerBedSpot ?? 0)
      : Number(house.pricePerFloorSpot ?? 0);

    const depositLevel = isBed
      ? Number(trip.depositBed ?? 0)
      : Number(trip.depositFloor ?? 0);
    const memberDeposit = member.depositAmount != null
      ? Number(member.depositAmount)
      : depositLevel;

    const net = Math.max(0, spotPrice - memberDeposit);
    total += spotPrice;
    splits.push({ userId: member.userId, share: net });
  }

  const listingDomain = (() => {
    try { return new URL(house.listingUrl).hostname.replace("www.", ""); }
    catch { return house.listingUrl; }
  })();

  await prisma.expense.create({
    data: {
      tripId,
      paidById: session.user.id,
      category: "LODGING",
      description: `House Expense — ${listingDomain}`,
      amount: total,
      currency: "USD",
      date: new Date(),
      splits: {
        create: splits.map((s) => ({
          tripId,
          userId: s.userId,
          share: s.share,
        })),
      },
    },
  });

  revalidatePath(`/trips/${trip.slug}/housing`);
  revalidatePath(`/trips/${trip.slug}/expenses`);
  return { success: true };
}
