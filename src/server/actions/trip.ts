"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { createTripSchema, updateTripSchema } from "@/lib/validators/trip";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { sendEmail } from "@/lib/email";
import { TripCancelledEmail } from "@/emails/trip-cancelled";
import { format } from "date-fns";

export async function createTrip(
  _prevState: { error?: Record<string, string[] | undefined> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTripSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
      values: raw as Record<string, string>,
    };
  }

  const data = parsed.data;
  const slug = await generateUniqueSlug(data.name);

  const trip = await prisma.trip.create({
    data: {
      slug,
      name: data.name,
      resort: data.resort,
      state: data.state || null,
      country: data.country,
      resortWebsite: data.resortWebsite || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      description: data.description || null,
      visibility: data.visibility,
      capacityMin: data.capacityMin ?? null,
      capacityMax: data.capacityMax ?? null,
      estimatedCostMin: data.estimatedCostMin ?? null,
      estimatedCostMax: data.estimatedCostMax ?? null,
      depositFloor: data.depositFloor ?? null,
      depositBed: data.depositBed ?? null,
      costNotes: data.costNotes || null,
      organizers: {
        create: {
          userId: session.user.id,
          addedBy: session.user.id,
        },
      },
    },
  });

  redirect(`/trips/${trip.slug}`);
}

export async function updateTrip(
  tripId: string,
  _prevState: { error?: Record<string, string[] | undefined> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  // Verify organizer access
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) {
    return { error: { _form: ["You are not an organizer of this trip"] } };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTripSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
      values: raw as Record<string, string>,
    };
  }

  const data = parsed.data;

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.resort !== undefined && { resort: data.resort }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.resortWebsite !== undefined && {
        resortWebsite: data.resortWebsite || null,
      }),
      ...(data.startDate !== undefined && {
        startDate: new Date(data.startDate),
      }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.description !== undefined && {
        description: data.description || null,
      }),
      ...(data.visibility !== undefined && { visibility: data.visibility }),
      capacityMin: data.capacityMin ?? null,
      capacityMax: data.capacityMax ?? null,
      estimatedCostMin: data.estimatedCostMin ?? null,
      estimatedCostMax: data.estimatedCostMax ?? null,
      depositFloor: data.depositFloor ?? null,
      depositBed: data.depositBed ?? null,
      ...(data.costNotes !== undefined && {
        costNotes: data.costNotes || null,
      }),
      ...(data.tripInfo !== undefined && { tripInfo: data.tripInfo || null }),
      ...(data.inviteDeadline !== undefined && {
        inviteDeadline: data.inviteDeadline
          ? new Date(data.inviteDeadline)
          : null,
      }),
      ...(data.confirmDeadline !== undefined && {
        confirmDeadline: data.confirmDeadline
          ? new Date(data.confirmDeadline)
          : null,
      }),
      ...(data.lodgingNotes !== undefined && {
        lodgingNotes: data.lodgingNotes || null,
      }),
    },
  });

  revalidatePath(`/trips/${trip.slug}`);
  redirect(`/trips/${trip.slug}`);
}

export async function deleteTrip(tripId: string) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) {
    return { error: "You are not an organizer of this trip" };
  }

  // Only allow deleting DRAFT trips
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.status !== "DRAFT") {
    return { error: "Only draft trips can be deleted" };
  }

  await prisma.trip.delete({ where: { id: tripId } });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function cancelTrip(tripId: string) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      status: true,
      slug: true,
      name: true,
      resort: true,
      startDate: true,
      endDate: true,
      organizers: {
        select: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!trip) return { error: "Trip not found" };
  if (trip.status === "CANCELLED") return { error: "Trip is already cancelled" };

  await prisma.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED" },
  });

  const organizerName = trip.organizers[0]?.user.name ?? "The organizer";
  const startDate = format(trip.startDate, "MMM d, yyyy");
  const endDate = format(trip.endDate, "MMM d, yyyy");

  // Collect emails from confirmed members and active interest responses
  const [members, interestResponses] = await Promise.all([
    prisma.tripMember.findMany({
      where: { tripId, status: "CONFIRMED" },
      select: { user: { select: { email: true } } },
    }),
    prisma.interestResponse.findMany({
      where: { tripId, status: { in: ["PENDING", "INTERESTED", "WAITLISTED", "CONFIRMED"] } },
      select: { email: true },
    }),
  ]);

  const emailSet = new Set<string>();
  for (const m of members) if (m.user?.email) emailSet.add(m.user.email);
  for (const r of interestResponses) if (r.email) emailSet.add(r.email);
  const recipients = Array.from(emailSet);

  if (recipients.length > 0) {
    await sendEmail({
      to: recipients,
      subject: `${trip.name} has been cancelled`,
      react: TripCancelledEmail({
        tripName: trip.name,
        resort: trip.resort,
        startDate,
        endDate,
        organizerName,
      }),
    });
  }

  revalidatePath(`/trips/${trip.slug}`);
  revalidatePath(`/trips/${trip.slug}/edit`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function launchTrip(tripId: string) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { status: true, slug: true },
  });
  if (!trip) return { error: "Trip not found" };
  if (trip.status !== "DRAFT") return { error: "Trip is already launched" };

  await prisma.trip.update({
    where: { id: tripId },
    data: { status: "INVITING" },
  });

  revalidatePath(`/trips/${trip.slug}`);
  revalidatePath(`/trips/${trip.slug}/invitations`);
  return { success: true };
}
