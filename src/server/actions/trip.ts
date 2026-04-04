"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { createTripSchema, updateTripSchema } from "@/lib/validators/trip";
import { generateUniqueSlug } from "@/lib/utils/slug";

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
      ...(data.capacityMin !== undefined && {
        capacityMin: data.capacityMin ?? null,
      }),
      ...(data.capacityMax !== undefined && {
        capacityMax: data.capacityMax ?? null,
      }),
      ...(data.estimatedCostMin !== undefined && {
        estimatedCostMin: data.estimatedCostMin ?? null,
      }),
      ...(data.estimatedCostMax !== undefined && {
        estimatedCostMax: data.estimatedCostMax ?? null,
      }),
      ...(data.depositFloor !== undefined && {
        depositFloor: data.depositFloor ?? null,
      }),
      ...(data.depositBed !== undefined && {
        depositBed: data.depositBed ?? null,
      }),
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
