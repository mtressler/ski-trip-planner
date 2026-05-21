"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

export async function saveTripInfo(
  tripId: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const tripInfo = (formData.get("tripInfo") as string) ?? "";

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { tripInfo: tripInfo || null },
    select: { slug: true },
  });

  revalidatePath(`/trips/${trip.slug}/info`);

  return { success: true };
}
