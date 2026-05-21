"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/email";
import { TripUpdateEmail } from "@/emails/trip-update";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required").max(5000),
  sendEmail: z.string().optional(),
  pinned: z.string().optional(),
});

export async function createUpdate(
  tripId: string,
  _prevState: { error?: Record<string, string[]>; values?: Record<string, string> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
    include: { user: { select: { name: true } } },
  });
  if (!organizer) return { error: { _form: ["Not authorized"] } };

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors, values: raw as Record<string, string> };
  }

  const { title, body } = parsed.data;
  const shouldEmail = raw.sendEmail === "on";
  const pinned = raw.pinned === "on";

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      slug: true,
      name: true,
      members: {
        where: { status: "CONFIRMED" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!trip) return { error: { _form: ["Trip not found"] } };

  const update = await prisma.tripUpdate.create({
    data: {
      tripId,
      authorId: session.user.id,
      title,
      body,
      pinned,
      sentEmail: shouldEmail,
    },
  });

  if (shouldEmail && trip.members.length > 0) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const tripUrl = `${baseUrl}/trips/${trip.slug}/updates`;

    await Promise.all(
      trip.members.map((member) =>
        sendEmail({
          to: member.user.email,
          subject: `${title} — ${trip.name}`,
          react: TripUpdateEmail({
            name: member.user.name ?? member.user.email,
            tripName: trip.name,
            updateTitle: title,
            updateBody: body,
            tripUrl,
          }),
        })
      )
    );
  }

  revalidatePath(`/trips/${trip.slug}/updates`);
  return { success: true, updateId: update.id };
}

export async function deleteUpdate(tripId: string, updateId: string) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const update = await prisma.tripUpdate.findUnique({ where: { id: updateId } });
  if (!update || update.tripId !== tripId) return { error: "Update not found" };

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { slug: true } });

  await prisma.tripUpdate.delete({ where: { id: updateId } });
  revalidatePath(`/trips/${trip!.slug}/updates`);
  return { success: true };
}

export async function togglePinUpdate(tripId: string, updateId: string) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) return { error: "Not authorized" };

  const update = await prisma.tripUpdate.findUnique({ where: { id: updateId } });
  if (!update || update.tripId !== tripId) return { error: "Update not found" };

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { slug: true } });

  await prisma.tripUpdate.update({
    where: { id: updateId },
    data: { pinned: !update.pinned },
  });

  revalidatePath(`/trips/${trip!.slug}/updates`);
  return { success: true };
}
