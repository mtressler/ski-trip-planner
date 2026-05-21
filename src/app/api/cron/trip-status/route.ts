import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { InviteDeadlineReminderEmail } from "@/emails/invite-deadline-reminder";
import { TripStartingSoonEmail } from "@/emails/trip-starting-soon";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    // ── Status transitions ────────────────────────────────────────
    const [toInProgress, toCompleted] = await Promise.all([
      prisma.trip.updateMany({
        where: { status: { in: ["INVITING", "CONFIRMED"] }, startDate: { lte: now } },
        data: { status: "IN_PROGRESS" },
      }),
      prisma.trip.updateMany({
        where: { status: "IN_PROGRESS", endDate: { lt: now } },
        data: { status: "COMPLETED" },
      }),
    ]);

    // ── E-11: Invite deadline approaching (48h) ───────────────────
    const e11Trips = await prisma.trip.findMany({
      where: {
        status: { in: ["INVITING", "CONFIRMED"] },
        inviteDeadline: { gte: in48h, lte: in72h },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        resort: true,
        startDate: true,
        endDate: true,
        inviteDeadline: true,
        inviteToken: true,
      },
    });

    let e11Count = 0;
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    for (const trip of e11Trips) {
      const responses = await prisma.interestResponse.findMany({
        where: { tripId: trip.id, status: "INTERESTED", reminderSentAt: null },
      });
      for (const r of responses) {
        await sendEmail({
          to: r.email,
          subject: `Last chance: ${trip.name} interest form closes in 48 hours`,
          react: InviteDeadlineReminderEmail({
            name: r.name,
            tripName: trip.name,
            resort: trip.resort,
            startDate: format(trip.startDate, "MMM d, yyyy"),
            endDate: format(trip.endDate, "MMM d, yyyy"),
            deadlineDate: format(trip.inviteDeadline!, "MMM d, yyyy 'at' h:mm a"),
            inviteUrl: `${baseUrl}/invite/${trip.inviteToken}`,
          }),
        });
        await prisma.interestResponse.update({
          where: { id: r.id },
          data: { reminderSentAt: new Date() },
        });
        e11Count++;
      }
    }

    // ── E-12: Trip starting soon (48h) — daily cron window dedups ─
    const e12Trips = await prisma.trip.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        startDate: { gte: in48h, lte: in72h },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        resort: true,
        startDate: true,
        endDate: true,
        lodgingNotes: true,
        lodgingCheckIn: true,
        lodgingCheckOut: true,
        members: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { name: true, email: true } } },
        },
      },
    });

    let e12Count = 0;

    for (const trip of e12Trips) {
      const recipients = trip.members
        .map((m) => ({ email: m.user?.email, name: m.user?.name ?? m.user?.email }))
        .filter((r): r is { email: string; name: string } => Boolean(r.email));

      for (const r of recipients) {
        await sendEmail({
          to: r.email,
          subject: `${trip.name} is almost here — here's everything you need`,
          react: TripStartingSoonEmail({
            name: r.name,
            tripName: trip.name,
            resort: trip.resort,
            startDate: format(trip.startDate, "MMM d, yyyy"),
            endDate: format(trip.endDate, "MMM d, yyyy"),
            lodgingNotes: trip.lodgingNotes ?? undefined,
            checkIn: trip.lodgingCheckIn ? format(trip.lodgingCheckIn, "MMM d, yyyy") : undefined,
            checkOut: trip.lodgingCheckOut ? format(trip.lodgingCheckOut, "MMM d, yyyy") : undefined,
            tripUrl: `${baseUrl}/trips/${trip.slug}`,
          }),
        });
        e12Count++;
      }
    }

    return NextResponse.json({
      ok: true,
      transitioned: { toInProgress: toInProgress.count, toCompleted: toCompleted.count },
      emails: { e11: e11Count, e12: e12Count },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
