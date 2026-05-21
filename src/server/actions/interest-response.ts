"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { interestResponseSchema } from "@/lib/validators/interest-response";
import { sendEmail } from "@/lib/email";
import { InterestConfirmationEmail } from "@/emails/interest-confirmation";
import { format } from "date-fns";

const interestLabels: Record<string, string> = {
  INTERESTED: "Yes, I'm in!",
  PENDING: "Maybe, tell me more",
  NOT_INTERESTED: "I can't make it",
};

export async function submitInterestResponse(
  inviteToken: string,
  editToken: string | null,
  _prevState:
    | { error?: Record<string, string[] | undefined>; values?: Record<string, string> }
    | undefined,
  formData: FormData
) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = interestResponseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
      values: raw as Record<string, string>,
    };
  }

  const data = parsed.data;

  // Look up the trip by invite token
  const trip = await prisma.trip.findUnique({
    where: { inviteToken },
    select: {
      id: true,
      name: true,
      resort: true,
      startDate: true,
      endDate: true,
      inviteDeadline: true,
      inviteToken: true,
    },
  });

  if (!trip) {
    return { error: { _form: ["Invalid invitation link"] } };
  }

  // Check invite deadline
  if (trip.inviteDeadline && new Date() > trip.inviteDeadline) {
    return { error: { _form: ["The deadline for this trip has passed"] } };
  }

  // Check if this is an edit (existing response via editToken) or new/duplicate
  let existingResponse = editToken
    ? await prisma.interestResponse.findUnique({ where: { editToken } })
    : null;

  // Check if the submitted email already has a response for this trip
  const emailConflict = await prisma.interestResponse.findUnique({
    where: { tripId_email: { tripId: trip.id, email: data.email } },
  });

  if (emailConflict && emailConflict.id !== existingResponse?.id) {
    // The email belongs to a different record — merge into it
    existingResponse = emailConflict;
  } else if (!existingResponse && emailConflict) {
    existingResponse = emailConflict;
  }

  // Map interest level to status
  const status = data.interestLevel;

  let responseEditToken: string;

  if (existingResponse) {
    // Update existing response
    const updated = await prisma.interestResponse.update({
      where: { id: existingResponse.id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        status,
        guestCount: data.guestCount,
        rentalNeeds: data.rentalNeeds,
        skillLevel: data.skillLevel,
        skiDays: data.skiDays,
        travelMode: data.travelMode,
        schoolYear: data.schoolYear,
        schoolYearOther:
          data.schoolYear === "OTHER" ? data.schoolYearOther || null : null,
        sleepingPreference: data.sleepingPreference,
        comments: data.comments || null,
      },
    });
    responseEditToken = updated.editToken;
  } else {
    // Create new response
    const created = await prisma.interestResponse.create({
      data: {
        tripId: trip.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        status,
        guestCount: data.guestCount,
        rentalNeeds: data.rentalNeeds,
        skillLevel: data.skillLevel,
        skiDays: data.skiDays,
        travelMode: data.travelMode,
        schoolYear: data.schoolYear,
        schoolYearOther:
          data.schoolYear === "OTHER" ? data.schoolYearOther || null : null,
        sleepingPreference: data.sleepingPreference,
        comments: data.comments || null,
      },
    });
    responseEditToken = created.editToken;
  }

  // Send confirmation email (E-02)
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const editUrl = `${baseUrl}/invite/${trip.inviteToken}?ref=${responseEditToken}`;

  await sendEmail({
    to: data.email,
    subject: `Thanks for your interest in ${trip.name}`,
    react: InterestConfirmationEmail({
      name: data.name,
      tripName: trip.name,
      resort: trip.resort,
      startDate: format(trip.startDate, "MMM d, yyyy"),
      endDate: format(trip.endDate, "MMM d, yyyy"),
      interestLevel: interestLabels[data.interestLevel] ?? data.interestLevel,
      editUrl,
    }),
  });

  redirect(`/invite/${inviteToken}/submitted`);
}
