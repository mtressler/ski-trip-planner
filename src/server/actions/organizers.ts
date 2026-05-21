"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

export async function addOrganizer(
  tripId: string,
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Invalid email address" };

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return { error: "No account found with that email" };
  if (targetUser.id === session.user.id) return { error: "You are already an organizer" };

  const existing = await prisma.tripOrganizer.findUnique({
    where: { tripId_userId: { tripId, userId: targetUser.id } },
  });
  if (existing) return { error: "This person is already an organizer" };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { slug: true },
  });
  if (!trip) return { error: "Trip not found" };

  await prisma.tripOrganizer.create({
    data: { tripId, userId: targetUser.id, addedBy: session.user.id },
  });

  revalidatePath(`/trips/${trip.slug}/attendees`);
  revalidatePath(`/trips/${trip.slug}`);

  return { success: `${targetUser.name ?? targetUser.email} is now a co-organizer` };
}

export async function removeOrganizer(tripId: string, organizerUserId: string) {
  const session = await requireAuth();

  // Must be an organizer to remove others
  const callerOrg = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!callerOrg) return { error: "Not authorized" };

  // Can't remove yourself if you're the only organizer
  const allOrganizers = await prisma.tripOrganizer.findMany({ where: { tripId } });
  if (allOrganizers.length <= 1) return { error: "Trip must have at least one organizer" };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { slug: true },
  });
  if (!trip) return { error: "Trip not found" };

  await prisma.tripOrganizer.deleteMany({
    where: { tripId, userId: organizerUserId },
  });

  revalidatePath(`/trips/${trip.slug}/attendees`);
  revalidatePath(`/trips/${trip.slug}`);

  return { success: "Organizer removed" };
}
