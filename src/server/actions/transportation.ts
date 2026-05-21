"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { z } from "zod";

type ActionState = { error?: Record<string, string[]>; success?: boolean } | undefined;

const flyingSchema = z.object({
  travelMode: z.literal("FLYING"),
  arrivalAirport: z.string().min(1, "Arrival airport is required"),
  departureSameAsArrival: z.preprocess((v) => v === "true" || v === true, z.boolean()),
  departureAirport: z.string().optional(),
  arrivalTime: z.string().min(1, "Arrival time is required"),
  departureTime: z.string().min(1, "Departure time is required"),
  rentingCar: z.preprocess((v) => v === "true" || v === true, z.boolean()),
  comments: z.string().max(1000).optional(),
});

const drivingDriverSchema = z.object({
  travelMode: z.literal("DRIVING"),
  driveRole: z.literal("DRIVER"),
  driveArrivalTime: z.string().min(1, "Arrival time is required"),
  driveDepartureTime: z.string().min(1, "Departure time is required"),
  confirmedPassengers: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0, "Must be 0 or more").optional()
  ),
  extraSeats: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0, "Extra seats must be 0 or more").optional()
  ),
  comments: z.string().max(1000).optional(),
});

const drivingPassengerSchema = z.object({
  travelMode: z.literal("DRIVING"),
  driveRole: z.literal("PASSENGER"),
  driverTripMemberId: z.string().optional(),
  comments: z.string().max(1000).optional(),
});

export async function saveTransportationDetail(
  tripId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      slug: true,
      organizers: { select: { userId: true } },
      members: {
        where: { status: "CONFIRMED" },
        select: { userId: true, id: true },
      },
    },
  });
  if (!trip) return { error: { _form: ["Trip not found"] } };

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  const member = trip.members.find((m) => m.userId === session.user.id);
  if (!isOrganizer && !member) return { error: { _form: ["Not authorized"] } };

  const tripMemberId = member?.id;
  if (!tripMemberId) return { error: { _form: ["You must be a confirmed member to submit transportation details"] } };

  const raw = Object.fromEntries(formData.entries());
  const travelMode = raw.travelMode;

  let data: Record<string, unknown>;

  if (travelMode === "FLYING") {
    const parsed = flyingSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.flatten().fieldErrors };
    }
    const { arrivalAirport, departureSameAsArrival, departureAirport, arrivalTime, departureTime, rentingCar, comments } = parsed.data;
    if (!departureSameAsArrival && !departureAirport) {
      return { error: { departureAirport: ["Departure airport is required when different from arrival"] } };
    }
    data = {
      travelMode: "FLYING" as const,
      arrivalAirport,
      departureSameAsArrival,
      departureAirport: departureSameAsArrival ? null : (departureAirport ?? null),
      arrivalTime: new Date(arrivalTime),
      departureTime: new Date(departureTime),
      rentingCar,
      comments: comments || null,
      // Clear driving fields
      driveRole: null,
      driveArrivalTime: null,
      driveDepartureTime: null,
      extraSeats: null,
      driverTripMemberId: null,
    };
  } else if (travelMode === "DRIVING") {
    const driveRole = raw.driveRole;
    if (driveRole === "DRIVER") {
      const parsed = drivingDriverSchema.safeParse(raw);
      if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
      }
      const { driveArrivalTime, driveDepartureTime, confirmedPassengers, extraSeats, comments } = parsed.data;
      data = {
        travelMode: "DRIVING" as const,
        driveRole: "DRIVER" as const,
        driveArrivalTime: new Date(driveArrivalTime),
        driveDepartureTime: new Date(driveDepartureTime),
        confirmedPassengers: confirmedPassengers ?? null,
        extraSeats: extraSeats ?? null,
        comments: comments || null,
        // Clear flying fields
        arrivalAirport: null,
        departureSameAsArrival: true,
        departureAirport: null,
        arrivalTime: null,
        departureTime: null,
        rentingCar: null,
        driverTripMemberId: null,
      };
    } else {
      const parsed = drivingPassengerSchema.safeParse(raw);
      if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
      }
      const { driverTripMemberId, comments } = parsed.data;
      data = {
        travelMode: "DRIVING" as const,
        driveRole: "PASSENGER" as const,
        driverTripMemberId: driverTripMemberId || null,
        comments: comments || null,
        // Clear flying fields
        arrivalAirport: null,
        departureSameAsArrival: true,
        departureAirport: null,
        arrivalTime: null,
        departureTime: null,
        rentingCar: null,
        driveArrivalTime: null,
        driveDepartureTime: null,
        extraSeats: null,
      };
    }
  } else {
    return { error: { _form: ["Invalid travel mode"] } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.transportationDetail.upsert({
    where: { tripMemberId },
    create: { tripId, tripMemberId, ...(data as any) },
    update: data as any,
  });

  revalidatePath(`/trips/${trip.slug}/transportation`);
  return { success: true };
}
