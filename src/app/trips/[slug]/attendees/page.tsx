import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithdrawButton, RemoveButton } from "@/components/attendees/member-actions";
import { AddOrganizerForm } from "@/components/attendees/add-organizer-form";
import { RemoveOrganizerButton } from "@/components/attendees/remove-organizer-button";
import { CsvExportButton } from "@/components/attendees/csv-export-button";

const memberStatusColors: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  WITHDRAWN: "bg-gray-100 text-gray-500",
  REMOVED: "bg-red-100 text-red-500",
};

const skillLabels: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: {
      organizers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          interestResponse: { select: { guestCount: true, comments: true } },
        },
        orderBy: { confirmedAt: "asc" },
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  if (!isOrganizer) notFound();

  const activeMembers = trip.members.filter((m) => m.status === "CONFIRMED");
  const withdrawnMembers = trip.members.filter(
    (m) => m.status === "WITHDRAWN" || m.status === "REMOVED"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Attendees</h2>
          <p className="text-sm text-muted-foreground">
            {activeMembers.length} confirmed
            {trip.capacityMax ? ` / ${trip.capacityMax} max` : ""}
          </p>
        </div>
        {trip.members.length > 0 && (
          <CsvExportButton tripId={trip.id} tripSlug={trip.slug} />
        )}
      </div>

      {/* Confirmed members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmed ({activeMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No confirmed attendees yet. Confirm interested responses from the Invitations tab.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Sleep</th>
                    <th className="pb-2 pr-4 font-medium">Skill</th>
                    <th className="pb-2 pr-4 font-medium">Ski Days</th>
                    <th className="pb-2 pr-4 font-medium">Guests</th>
                    <th className="pb-2 pr-4 font-medium">Deposit</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {activeMembers.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">
                        {member.user.name ?? (
                          <span className="text-muted-foreground italic">No name</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {member.user.email}
                      </td>
                      <td className="py-2.5 pr-4 capitalize lowercase first-letter:uppercase">
                        {member.sleepingPreference.charAt(0) + member.sleepingPreference.slice(1).toLowerCase()}
                      </td>
                      <td className="py-2.5 pr-4">
                        {skillLabels[member.skillLevel]}
                      </td>
                      <td className="py-2.5 pr-4">{member.skiDays}</td>
                      <td className="py-2.5 pr-4">
                        {member.interestResponse?.guestCount ?? 1}
                      </td>
                      <td className="py-2.5 pr-4">
                        {member.depositConfirmedBySelf ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Paid
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <WithdrawButton
                            tripId={trip.id}
                            memberId={member.id}
                            memberName={member.user.name ?? member.user.email}
                          />
                          <RemoveButton
                            tripId={trip.id}
                            memberId={member.id}
                            memberName={member.user.name ?? member.user.email}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawn / Removed */}
      {withdrawnMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Withdrawn / Removed ({withdrawnMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawnMembers.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {member.user.name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {member.user.email}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant="secondary"
                          className={memberStatusColors[member.status]}
                        >
                          {member.status.charAt(0) + member.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizers</CardTitle>
          <CardDescription>
            Co-organizers can manage invitations, attendees, and trip details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {trip.organizers.map((org) => (
              <div key={org.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">
                    {org.user.name ?? org.user.email}
                  </span>
                  {org.user.name && (
                    <span className="text-sm text-muted-foreground ml-2">
                      {org.user.email}
                    </span>
                  )}
                </div>
                {org.userId !== session.user.id && trip.organizers.length > 1 && (
                  <RemoveOrganizerButton
                    tripId={trip.id}
                    organizerUserId={org.userId}
                    organizerName={org.user.name ?? org.user.email}
                  />
                )}
              </div>
            ))}
          </div>
          <AddOrganizerForm tripId={trip.id} />
        </CardContent>
      </Card>
    </div>
  );
}
