"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

async function requireOrganizer(slug: string) {
  const session = await requireAuth();
  const trip = await prisma.trip.findUnique({
    where: { slug },
    select: { id: true, slug: true, organizers: { select: { userId: true } } },
  });
  if (!trip) return null;
  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  if (!isOrganizer) return null;
  return { trip, session };
}

export async function createTransferGroup(
  slug: string,
  direction: "TO_LODGING" | "TO_AIRPORT",
  name: string,
  maxCapacity: number | null
) {
  const ctx = await requireOrganizer(slug);
  if (!ctx) return { error: "Not authorized" };

  const group = await prisma.transferGroup.create({
    data: {
      tripId: ctx.trip.id,
      direction,
      name,
      maxCapacity,
    },
  });

  revalidatePath(`/trips/${slug}/transfers`);
  return { success: true, groupId: group.id };
}

export async function deleteTransferGroup(slug: string, groupId: string) {
  const ctx = await requireOrganizer(slug);
  if (!ctx) return { error: "Not authorized" };

  // Unassign all participants in this group before deleting
  await prisma.transferAssignment.deleteMany({
    where: { transferGroupId: groupId, tripId: ctx.trip.id },
  });

  await prisma.transferGroup.delete({ where: { id: groupId } });

  revalidatePath(`/trips/${slug}/transfers`);
  return { success: true };
}

export async function updateTransferGroup(
  slug: string,
  groupId: string,
  data: { name?: string; maxCapacity?: number | null; driverId?: string | null }
) {
  const ctx = await requireOrganizer(slug);
  if (!ctx) return { error: "Not authorized" };

  await prisma.transferGroup.update({
    where: { id: groupId },
    data,
  });

  revalidatePath(`/trips/${slug}/transfers`);
  return { success: true };
}

export async function assignParticipant(
  slug: string,
  tripMemberId: string,
  direction: "TO_LODGING" | "TO_AIRPORT",
  type: "CAR_GROUP" | "OWN" | "SHUTTLE",
  transferGroupId: string | null
) {
  const ctx = await requireOrganizer(slug);
  if (!ctx) return { error: "Not authorized" };

  await prisma.transferAssignment.upsert({
    where: { tripMemberId_direction: { tripMemberId, direction } },
    create: {
      tripId: ctx.trip.id,
      tripMemberId,
      direction,
      type,
      transferGroupId: type === "CAR_GROUP" ? transferGroupId : null,
      assignedBy: ctx.session.user.id,
    },
    update: {
      type,
      transferGroupId: type === "CAR_GROUP" ? transferGroupId : null,
      assignedBy: ctx.session.user.id,
    },
  });

  revalidatePath(`/trips/${slug}/transfers`);
  return { success: true };
}

export async function unassignParticipant(
  slug: string,
  tripMemberId: string,
  direction: "TO_LODGING" | "TO_AIRPORT"
) {
  const ctx = await requireOrganizer(slug);
  if (!ctx) return { error: "Not authorized" };

  await prisma.transferAssignment.deleteMany({
    where: { tripMemberId, direction, tripId: ctx.trip.id },
  });

  revalidatePath(`/trips/${slug}/transfers`);
  return { success: true };
}
