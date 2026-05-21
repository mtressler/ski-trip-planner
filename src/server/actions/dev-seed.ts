"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

if (process.env.NODE_ENV === "production") {
  throw new Error("dev-seed actions must not be used in production");
}

const FIRST_NAMES = ["Alex","Jordan","Taylor","Morgan","Casey","Riley","Avery","Quinn","Drew","Blake","Sage","Reese","Jamie","Parker","Logan","Cameron","Skyler","Rowan","Finley","Peyton","Dylan","Hayden","Emerson","Kendall","Sloane","Briar","Wren","Cleo","Zara","Noel"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Taylor","Anderson","Thomas","Moore","Jackson","White","Harris","Martin","Thompson","Young","Robinson","Walker","Lewis","Hall","Allen","King","Wright","Scott","Green","Adams","Baker"];
const DOMAINS = ["gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEmail(first: string, last: string, index: number): string {
  const tag = Math.random() > 0.5 ? `${first.toLowerCase()}.${last.toLowerCase()}` : `${first.toLowerCase()}${randInt(1, 999)}`;
  return `dev+${index}_${tag}@${pick(DOMAINS)}`;
}

export async function seedRandomResponses(
  tripId: string,
  count: number,
  interestMode: "all_interested" | "random"
) {
  await requireAuth();

  if (process.env.NODE_ENV === "production") {
    return { error: "Not available in production" };
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { slug: true, inviteToken: true },
  });
  if (!trip) return { error: "Trip not found" };

  const statuses = ["INTERESTED", "INTERESTED", "INTERESTED", "PENDING", "NOT_INTERESTED"] as const;
  const rentalNeeds = ["NONE", "NONE", "SKIS", "SNOWBOARD", "BOOTS", "FULL_PACKAGE"] as const;
  const skillLevels = ["BEGINNER", "INTERMEDIATE", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
  const travelModes = ["DRIVING", "DRIVING", "FLYING"] as const;
  const schoolYears = ["FRESHMAN", "SOPHOMORE", "JUNIOR", "SENIOR", "ALUM"] as const;
  const sleepPrefs = ["FLOOR", "FLOOR", "BED"] as const;

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const email = randomEmail(first, last, Date.now() + i);
    const status = interestMode === "all_interested" ? "INTERESTED" : pick(statuses);
    const isPending = status === "PENDING";

    try {
      await prisma.interestResponse.create({
        data: {
          tripId,
          email,
          // PENDING with no name = "no response"; give names to all others and some maybes
          name: isPending && Math.random() > 0.5 ? "" : `${first} ${last}`,
          status,
          guestCount: randInt(1, 4),
          rentalNeeds: pick(rentalNeeds),
          skillLevel: pick(skillLevels),
          skiDays: randInt(0, 7),
          travelMode: pick(travelModes),
          schoolYear: pick(schoolYears),
          sleepingPreference: pick(sleepPrefs),
          comments: Math.random() > 0.7 ? "Looking forward to it!" : null,
          inviteEmailSentAt: new Date(),
        },
      });
      created++;
    } catch {
      // Skip duplicate emails
      skipped++;
    }
  }

  revalidatePath(`/trips/${trip.slug}/invitations`);

  const msg = skipped > 0
    ? `Created ${created} responses (${skipped} skipped — duplicate emails)`
    : `Created ${created} responses`;

  return { success: msg };
}

const AIRPORTS = ["SLC", "DEN", "LAX", "SFO", "SEA", "ORD", "JFK", "BOS", "ATL", "PHX", "LAS", "MSP", "PDX", "DAL", "MIA"];

function randomTime(base: Date, offsetHours: number, spreadHours: number): Date {
  const d = new Date(base);
  d.setHours(offsetHours + randInt(0, spreadHours), Math.random() > 0.5 ? 30 : 0, 0, 0);
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function seedTransportationDetails(
  tripId: string,
  numFlyers: number,
  numDrivers: number,
  numRentingCar: number = 0
) {
  await requireAuth();

  if (process.env.NODE_ENV === "production") {
    return { error: "Not available in production" };
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      slug: true,
      startDate: true,
      endDate: true,
      members: {
        where: { status: "CONFIRMED" },
        select: { id: true, userId: true },
      },
    },
  });
  if (!trip) return { error: "Trip not found" };

  // Clear stale transfer state so the transfers page rebuilds from scratch
  await prisma.transferAssignment.deleteMany({ where: { tripId } });
  await prisma.transferGroup.deleteMany({ where: { tripId } });

  const members = shuffle(trip.members);
  const total = members.length;

  const clampedFlyers = Math.min(numFlyers, total);
  const clampedDrivers = Math.min(numDrivers, total - clampedFlyers);
  const passengers = total - clampedFlyers - clampedDrivers;

  const flyers = members.slice(0, clampedFlyers);
  const drivers = members.slice(clampedFlyers, clampedFlyers + clampedDrivers);
  const passengerList = members.slice(clampedFlyers + clampedDrivers);

  const start = trip.startDate;
  const end = trip.endDate;

  // Upsert all members
  const clampedRentingCar = Math.min(numRentingCar, clampedFlyers);

  for (let i = 0; i < flyers.length; i++) {
    const m = flyers[i];
    const rentingCar = i < clampedRentingCar;
    const arrAirport = pick(AIRPORTS);
    const depSame = Math.random() > 0.3;
    const depAirport = depSame ? null : pick(AIRPORTS.filter((a) => a !== arrAirport));
    const flyerData = {
      travelMode: "FLYING" as const,
      arrivalAirport: arrAirport,
      departureSameAsArrival: depSame,
      departureAirport: depAirport,
      arrivalTime: randomTime(start, 8, 10),
      departureTime: randomTime(end, 10, 8),
      rentingCar,
      driveRole: null,
      driveArrivalTime: null,
      driveDepartureTime: null,
      confirmedPassengers: null,
      extraSeats: null,
      driverTripMemberId: null,
    };
    await prisma.transportationDetail.upsert({
      where: { tripMemberId: m.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: { tripId, tripMemberId: m.id, ...(flyerData as any) },
      update: flyerData as any,
    });
  }

  for (const m of drivers) {
    const confirmedPassengers = passengerList.length > 0 ? randInt(0, Math.min(3, passengerList.length)) : 0;
    const extraSeats = randInt(0, 2);
    await prisma.transportationDetail.upsert({
      where: { tripMemberId: m.id },
      create: {
        tripId,
        tripMemberId: m.id,
        travelMode: "DRIVING",
        driveRole: "DRIVER",
        driveArrivalTime: randomTime(start, 7, 12),
        driveDepartureTime: randomTime(end, 8, 10),
        confirmedPassengers,
        extraSeats,
        arrivalAirport: null,
        departureSameAsArrival: true,
        departureAirport: null,
        arrivalTime: null,
        departureTime: null,
        rentingCar: null,
        driverTripMemberId: null,
      },
      update: {
        travelMode: "DRIVING",
        driveRole: "DRIVER",
        driveArrivalTime: randomTime(start, 7, 12),
        driveDepartureTime: randomTime(end, 8, 10),
        confirmedPassengers,
        extraSeats,
        arrivalAirport: null,
        departureSameAsArrival: true,
        departureAirport: null,
        arrivalTime: null,
        departureTime: null,
        rentingCar: null,
        driverTripMemberId: null,
      },
    });
  }

  for (const m of passengerList) {
    const randomDriver = drivers.length > 0 ? pick(drivers) : null;
    await prisma.transportationDetail.upsert({
      where: { tripMemberId: m.id },
      create: {
        tripId,
        tripMemberId: m.id,
        travelMode: "DRIVING",
        driveRole: "PASSENGER",
        driverTripMemberId: randomDriver?.id ?? null,
        confirmedPassengers: null,
        arrivalAirport: null,
        departureSameAsArrival: true,
        departureAirport: null,
        arrivalTime: null,
        departureTime: null,
        rentingCar: null,
        driveArrivalTime: null,
        driveDepartureTime: null,
        extraSeats: null,
      },
      update: {
        travelMode: "DRIVING",
        driveRole: "PASSENGER",
        driverTripMemberId: randomDriver?.id ?? null,
        confirmedPassengers: null,
        arrivalAirport: null,
        departureSameAsArrival: true,
        departureAirport: null,
        arrivalTime: null,
        departureTime: null,
        rentingCar: null,
        driveArrivalTime: null,
        driveDepartureTime: null,
        extraSeats: null,
      },
    });
  }

  revalidatePath(`/trips/${trip.slug}/transportation`);
  revalidatePath(`/trips/${trip.slug}/transfers`);
  return {
    success: `Randomized ${total} members: ${clampedFlyers} flying, ${clampedDrivers} driving, ${passengers} passengers`,
  };
}
