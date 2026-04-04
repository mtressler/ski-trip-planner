"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { sendInvitesSchema } from "@/lib/validators/interest-response";
import { sendEmail } from "@/lib/email";
import { InvitationEmail } from "@/emails/invitation";
import { MaybeReminderEmail } from "@/emails/maybe-reminder";
import { format } from "date-fns";

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export async function sendInvitations(
  tripId: string,
  _prevState: { error?: string; success?: string; duplicates?: string[] } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  // Verify organizer
  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!organizer) {
    return { error: "You are not an organizer of this trip" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = sendInvitesSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.emails?.[0] ?? "Invalid input" };
  }

  const emails = parseEmails(parsed.data.emails);
  if (emails.length === 0) {
    return { error: "No valid email addresses found" };
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      slug: true,
      name: true,
      resort: true,
      startDate: true,
      endDate: true,
      inviteToken: true,
      status: true,
    },
  });
  if (!trip) return { error: "Trip not found" };

  // Check for existing responses (duplicate detection)
  const existing = await prisma.interestResponse.findMany({
    where: { tripId, email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((r) => r.email));

  const newEmails = emails.filter((e) => !existingEmails.has(e));
  const duplicates = emails.filter((e) => existingEmails.has(e));

  const organizerName = organizer.user.name ?? organizer.user.email;
  const startDate = format(trip.startDate, "MMM d, yyyy");
  const endDate = format(trip.endDate, "MMM d, yyyy");

  let sentCount = 0;

  // Create InterestResponse records for new emails and send invitations
  for (const email of newEmails) {
    const response = await prisma.interestResponse.create({
      data: {
        tripId: trip.id,
        email,
        name: "",
        status: "PENDING",
        inviteEmailSentAt: new Date(),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${trip.inviteToken}?ref=${response.editToken}`;

    await sendEmail({
      to: email,
      subject: `You're invited to ${trip.name}!`,
      react: InvitationEmail({
        tripName: trip.name,
        resort: trip.resort,
        startDate,
        endDate,
        organizerName,
        inviteUrl,
        customMessage: parsed.data.customMessage || undefined,
      }),
    });

    sentCount++;
  }

  // Transition trip from DRAFT to INVITING on first invitation
  if (trip.status === "DRAFT" && sentCount > 0) {
    await prisma.trip.update({
      where: { id: trip.id },
      data: { status: "INVITING" },
    });
  }

  revalidatePath(`/trips/${trip.slug}/invitations`);

  const parts: string[] = [];
  if (sentCount > 0) parts.push(`Sent ${sentCount} invitation${sentCount > 1 ? "s" : ""}`);
  if (duplicates.length > 0)
    parts.push(`${duplicates.length} already invited`);

  return {
    success: parts.join(". "),
    duplicates: duplicates.length > 0 ? duplicates : undefined,
  };
}

export async function resendInvitation(tripId: string, responseId: string) {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!organizer) return { error: "Not authorized" };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { name: true, resort: true, startDate: true, endDate: true, inviteToken: true },
  });
  if (!trip) return { error: "Trip not found" };

  const response = await prisma.interestResponse.findUnique({
    where: { id: responseId },
  });
  if (!response || response.tripId !== tripId) return { error: "Response not found" };

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${trip.inviteToken}?ref=${response.editToken}`;
  const organizerName = organizer.user.name ?? organizer.user.email;

  const isMaybe = response.status === "PENDING" && !!response.name;
  const startDate = format(trip.startDate, "MMM d, yyyy");
  const endDate = format(trip.endDate, "MMM d, yyyy");

  await sendEmail({
    to: response.email,
    subject: isMaybe
      ? `Still thinking about ${trip.name}?`
      : `Reminder: You're invited to ${trip.name}!`,
    react: isMaybe
      ? MaybeReminderEmail({
          name: response.name,
          tripName: trip.name,
          resort: trip.resort,
          startDate,
          endDate,
          organizerName,
          editUrl: inviteUrl,
        })
      : InvitationEmail({
          tripName: trip.name,
          resort: trip.resort,
          startDate,
          endDate,
          organizerName,
          inviteUrl,
        }),
  });

  await prisma.interestResponse.update({
    where: { id: responseId },
    data: { reminderSentAt: new Date() },
  });

  return { success: `Reminder sent to ${response.email}` };
}
