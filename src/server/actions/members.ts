"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/email";
import { ConfirmationEmail } from "@/emails/confirmation";
import { WithdrawalNotificationEmail } from "@/emails/withdrawal-notification";
import { WaitlistSpotOpenedEmail } from "@/emails/waitlist-spot-opened";
import { format } from "date-fns";

async function getOrganizerAndTrip(tripId: string, userId: string) {
  const [organizer, trip] = await Promise.all([
    prisma.tripOrganizer.findFirst({
      where: { tripId, userId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        slug: true,
        name: true,
        resort: true,
        startDate: true,
        endDate: true,
        capacityMax: true,
        status: true,
        organizers: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    }),
  ]);
  return { organizer, trip };
}

export async function confirmMember(tripId: string, responseId: string) {
  const session = await requireAuth();
  const { organizer, trip } = await getOrganizerAndTrip(tripId, session.user.id);

  if (!organizer) return { error: "Not authorized" };
  if (!trip) return { error: "Trip not found" };

  const response = await prisma.interestResponse.findUnique({
    where: { id: responseId },
  });
  if (!response || response.tripId !== tripId) return { error: "Response not found" };
  if (response.status === "CONFIRMED") return { error: "Already confirmed" };
  if (response.status === "WITHDRAWN") return { error: "Response was withdrawn" };

  // Check capacity for waitlist
  if (trip.capacityMax) {
    const confirmedCount = await prisma.tripMember.count({
      where: { tripId, status: "CONFIRMED" },
    });
    if (confirmedCount >= trip.capacityMax) {
      // Waitlist this person
      await prisma.interestResponse.update({
        where: { id: responseId },
        data: { status: "WAITLISTED" },
      });
      revalidatePath(`/trips/${trip.slug}/invitations`);
      revalidatePath(`/trips/${trip.slug}/attendees`);
      return { success: `${response.name} has been waitlisted (trip is at capacity)` };
    }
  }

  // Find or create user
  const user = await prisma.user.upsert({
    where: { email: response.email },
    update: { name: response.name || undefined },
    create: {
      email: response.email,
      name: response.name || null,
    },
  });

  // Create TripMember (upsert in case they were previously withdrawn)
  const existingMember = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: user.id } },
  });

  if (existingMember) {
    await prisma.tripMember.update({
      where: { id: existingMember.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        withdrawnAt: null,
        withdrawalReason: null,
        interestResponseId: response.id,
        rentalNeeds: response.rentalNeeds,
        skillLevel: response.skillLevel,
        skiDays: response.skiDays,
        travelMode: response.travelMode,
        schoolYear: response.schoolYear,
        schoolYearOther: response.schoolYearOther,
        sleepingPreference: response.sleepingPreference,
      },
    });
  } else {
    await prisma.tripMember.create({
      data: {
        tripId,
        userId: user.id,
        interestResponseId: response.id,
        status: "CONFIRMED",
        rentalNeeds: response.rentalNeeds,
        skillLevel: response.skillLevel,
        skiDays: response.skiDays,
        travelMode: response.travelMode,
        schoolYear: response.schoolYear,
        schoolYearOther: response.schoolYearOther,
        sleepingPreference: response.sleepingPreference,
      },
    });
  }

  // Update interest response status and link user
  await prisma.interestResponse.update({
    where: { id: responseId },
    data: { status: "CONFIRMED", userId: user.id, confirmEmailSentAt: new Date() },
  });

  // Transition trip to CONFIRMED if it isn't already
  if (trip.status === "INVITING") {
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CONFIRMED" },
    });
  }

  // Send confirmation email
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const confirmUrl = `${baseUrl}/sign-in?callbackUrl=${encodeURIComponent(`/trips/${trip.slug}/confirm`)}`;
  const organizerName = organizer.user.name ?? organizer.user.email;

  await sendEmail({
    to: response.email,
    subject: `You're confirmed for ${trip.name}!`,
    react: ConfirmationEmail({
      name: response.name,
      tripName: trip.name,
      resort: trip.resort,
      startDate: format(trip.startDate, "MMM d, yyyy"),
      endDate: format(trip.endDate, "MMM d, yyyy"),
      organizerName,
      confirmUrl,
    }),
  });

  revalidatePath(`/trips/${trip.slug}/invitations`);
  revalidatePath(`/trips/${trip.slug}/attendees`);
  revalidatePath(`/trips/${trip.slug}`);

  return { success: `${response.name} has been confirmed` };
}

export async function bulkConfirmAll(tripId: string) {
  const session = await requireAuth();
  const { organizer, trip } = await getOrganizerAndTrip(tripId, session.user.id);

  if (!organizer) return { error: "Not authorized" };
  if (!trip) return { error: "Trip not found" };

  const interested = await prisma.interestResponse.findMany({
    where: { tripId, status: "INTERESTED" },
  });

  if (interested.length === 0) return { error: "No interested responses to confirm" };

  let confirmed = 0;
  let waitlisted = 0;

  for (const response of interested) {
    const result = await confirmMember(tripId, response.id);
    if (result.success?.includes("waitlisted")) {
      waitlisted++;
    } else if (result.success) {
      confirmed++;
    }
  }

  const parts: string[] = [];
  if (confirmed > 0) parts.push(`Confirmed ${confirmed}`);
  if (waitlisted > 0) parts.push(`${waitlisted} waitlisted (capacity reached)`);

  return { success: parts.join(". ") };
}

type TripForPromotion = {
  slug: string;
  name: string;
  resort: string;
  startDate: Date;
  endDate: Date;
  organizers: { user: { name: string | null; email: string } }[];
};

type InterestResponseForPromotion = {
  id: string;
  email: string;
  name: string;
};

async function promoteWaitlisted(
  tripId: string,
  response: InterestResponseForPromotion,
  trip: TripForPromotion
) {
  const user = await prisma.user.upsert({
    where: { email: response.email },
    update: {},
    create: { email: response.email, name: response.name || null },
  });
  const existingMember = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: user.id } },
  });
  if (existingMember) {
    await prisma.tripMember.update({
      where: { id: existingMember.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        withdrawnAt: null,
        withdrawalReason: null,
        interestResponseId: response.id,
      },
    });
  } else {
    await prisma.tripMember.create({
      data: { tripId, userId: user.id, interestResponseId: response.id, status: "CONFIRMED" },
    });
  }
  await prisma.interestResponse.update({
    where: { id: response.id },
    data: { status: "CONFIRMED", userId: user.id, confirmEmailSentAt: new Date() },
  });
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await sendEmail({
    to: response.email,
    subject: `A spot opened up on ${trip.name}!`,
    react: WaitlistSpotOpenedEmail({
      name: response.name,
      tripName: trip.name,
      resort: trip.resort,
      startDate: format(trip.startDate, "MMM d, yyyy"),
      endDate: format(trip.endDate, "MMM d, yyyy"),
      organizerName: trip.organizers[0]?.user.name ?? "The organizer",
      tripUrl: `${baseUrl}/trips/${trip.slug}`,
    }),
  });
}

export async function withdrawMember(
  tripId: string,
  memberId: string,
  reason?: string
) {
  const session = await requireAuth();
  const { organizer, trip } = await getOrganizerAndTrip(tripId, session.user.id);

  if (!organizer) return { error: "Not authorized" };
  if (!trip) return { error: "Trip not found" };

  const member = await prisma.tripMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member || member.tripId !== tripId) return { error: "Member not found" };
  if (member.status === "WITHDRAWN") return { error: "Already withdrawn" };

  await prisma.tripMember.update({
    where: { id: memberId },
    data: {
      status: "WITHDRAWN",
      withdrawnAt: new Date(),
      withdrawalReason: reason || null,
    },
  });

  // Also update interest response status
  if (member.interestResponseId) {
    await prisma.interestResponse.update({
      where: { id: member.interestResponseId },
      data: { status: "WITHDRAWN" },
    });
  }

  // Notify all organizers
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const attendeesUrl = `${baseUrl}/trips/${trip.slug}/attendees`;
  const memberName = member.user.name ?? member.user.email;

  for (const org of trip.organizers) {
    if (org.userId === session.user.id) continue; // Skip the acting organizer
    await sendEmail({
      to: org.user.email,
      subject: `${memberName} has withdrawn from ${trip.name}`,
      react: WithdrawalNotificationEmail({
        organizerName: org.user.name ?? org.user.email,
        memberName,
        tripName: trip.name,
        reason,
        attendeesUrl,
      }),
    });
  }

  // Auto-promote first waitlisted response (sends E-06, not E-04)
  const nextWaitlisted = await prisma.interestResponse.findFirst({
    where: { tripId, status: "WAITLISTED" },
    orderBy: { updatedAt: "asc" },
  });

  if (nextWaitlisted) {
    await promoteWaitlisted(tripId, nextWaitlisted, trip);
  }

  revalidatePath(`/trips/${trip.slug}/attendees`);
  revalidatePath(`/trips/${trip.slug}/invitations`);
  revalidatePath(`/trips/${trip.slug}`);

  return { success: `${memberName} has been withdrawn` };
}

export async function removeMember(tripId: string, memberId: string) {
  const session = await requireAuth();
  const { organizer, trip } = await getOrganizerAndTrip(tripId, session.user.id);

  if (!organizer) return { error: "Not authorized" };
  if (!trip) return { error: "Trip not found" };

  const member = await prisma.tripMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member || member.tripId !== tripId) return { error: "Member not found" };

  await prisma.tripMember.update({
    where: { id: memberId },
    data: { status: "REMOVED" },
  });

  // Update interest response too
  if (member.interestResponseId) {
    await prisma.interestResponse.update({
      where: { id: member.interestResponseId },
      data: { status: "NOT_INTERESTED" },
    });
  }

  // Auto-promote first waitlisted response (sends E-06, not E-04)
  const nextWaitlisted = await prisma.interestResponse.findFirst({
    where: { tripId, status: "WAITLISTED" },
    orderBy: { updatedAt: "asc" },
  });

  if (nextWaitlisted) {
    await promoteWaitlisted(tripId, nextWaitlisted, trip);
  }

  revalidatePath(`/trips/${trip.slug}/attendees`);
  revalidatePath(`/trips/${trip.slug}/invitations`);

  const memberName = member.user.name ?? member.user.email;
  return { success: `${memberName} has been removed` };
}

export async function submitAttendanceConfirmation(
  tripId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
  });
  if (!member) return { error: "You are not a member of this trip" };
  if (member.status !== "CONFIRMED") return { error: "Your membership is not active" };

  const fullTrip = formData.get("fullTrip") === "yes";
  const depositConfirmedBySelf = formData.get("depositConfirmedBySelf") === "on";

  let tripArrivalDate: Date | null = null;
  let tripDepartureDate: Date | null = null;

  if (!fullTrip) {
    const arrivalRaw = formData.get("tripArrivalDate") as string;
    const departureRaw = formData.get("tripDepartureDate") as string;
    if (arrivalRaw) tripArrivalDate = new Date(arrivalRaw);
    if (departureRaw) tripDepartureDate = new Date(departureRaw);
  }

  await prisma.tripMember.update({
    where: { id: member.id },
    data: {
      fullTripAttendance: fullTrip,
      tripArrivalDate,
      tripDepartureDate,
      depositConfirmedBySelf,
    },
  });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { slug: true },
  });

  revalidatePath(`/trips/${trip!.slug}`);
  revalidatePath(`/trips/${trip!.slug}/confirm`);
  revalidatePath(`/trips/${trip!.slug}/attendees`);

  return { success: true };
}

export async function getAttendeesCSV(tripId: string): Promise<string> {
  const session = await requireAuth();

  const organizer = await prisma.tripOrganizer.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!organizer) throw new Error("Not authorized");

  const members = await prisma.tripMember.findMany({
    where: { tripId, status: { in: ["CONFIRMED", "WITHDRAWN"] } },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      interestResponse: { select: { guestCount: true, comments: true } },
    },
    orderBy: { confirmedAt: "asc" },
  });

  const header = "Name,Email,Phone,Status,Ski Days,Sleep,Travel,Guests,Deposit Paid,Full Trip,Arrival,Departure";
  const rows = members.map((m) => {
    const cols = [
      `"${m.user.name ?? ""}"`,
      `"${m.user.email}"`,
      `"${m.user.phone ?? ""}"`,
      m.status,
      m.skiDays,
      m.sleepingPreference,
      m.travelMode,
      m.interestResponse?.guestCount ?? 1,
      m.depositConfirmedBySelf ? "Yes" : "No",
      m.fullTripAttendance ? "Yes" : "No",
      m.tripArrivalDate ? format(m.tripArrivalDate, "yyyy-MM-dd") : "",
      m.tripDepartureDate ? format(m.tripDepartureDate, "yyyy-MM-dd") : "",
    ];
    return cols.join(",");
  });

  return [header, ...rows].join("\n");
}
