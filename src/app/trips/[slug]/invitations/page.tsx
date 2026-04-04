import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { sendInvitations } from "@/server/actions/invitation";
import { SendInvitesForm } from "@/components/invitations/send-invites-form";
import { ResendButton } from "@/components/invitations/resend-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  INTERESTED: "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-red-100 text-red-700",
  WAITLISTED: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<string, string> = {
  PENDING: "Maybe",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not Interested",
  WAITLISTED: "Waitlisted",
  CONFIRMED: "Confirmed",
  WITHDRAWN: "Withdrawn",
};

export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: {
      organizers: { select: { userId: true } },
      interestResponses: {
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some(
    (o) => o.userId === session.user.id
  );
  if (!isOrganizer) notFound();

  const sendAction = sendInvitations.bind(null, trip.id);
  const isDev = process.env.NODE_ENV === "development";
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Stats
  const stats = {
    total: trip.interestResponses.length,
    interested: trip.interestResponses.filter((r) => r.status === "INTERESTED").length,
    maybe: trip.interestResponses.filter((r) => r.status === "PENDING" && r.name).length,
    noResponse: trip.interestResponses.filter((r) => r.status === "PENDING" && !r.name).length,
    notInterested: trip.interestResponses.filter((r) => r.status === "NOT_INTERESTED").length,
  };

  return (
    <div className="space-y-6">
      {/* Send Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Send Invitations</CardTitle>
          <CardDescription>
            Invite people to express their interest in this trip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SendInvitesForm action={sendAction} />
        </CardContent>
      </Card>

      {/* Dev: show invite links directly */}
      {isDev && trip.interestResponses.length > 0 && (
        <Card className="border-dashed border-yellow-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-700">Dev — Invite Links</CardTitle>
            <CardDescription className="text-xs">Only visible in development. Click to open the interest form as that invitee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {trip.interestResponses.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-48 truncate">{r.email}</span>
                <a
                  href={`${baseUrl}/invite/${trip.inviteToken}?ref=${r.editToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline truncate"
                >
                  {`/invite/${trip.inviteToken}?ref=${r.editToken}`}
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Interested", value: stats.interested },
            { label: "Maybe", value: stats.maybe },
            { label: "No Response", value: stats.noResponse },
            { label: "Not Interested", value: stats.notInterested },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Responses Table */}
      {trip.interestResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
            <CardDescription>
              {trip.interestResponses.length} invitation
              {trip.interestResponses.length !== 1 ? "s" : ""} sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Guests</th>
                    <th className="pb-2 pr-4 font-medium">Submitted</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {trip.interestResponses.map((response) => (
                    <tr key={response.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        {response.name || (
                          <span className="text-muted-foreground italic">
                            No response
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {response.email}
                      </td>
                      <td className="py-2.5 pr-4">
                        {!response.name && response.status === "PENDING" ? (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                            No Response
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={statusColors[response.status]}
                          >
                            {statusLabels[response.status]}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">{response.guestCount}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {response.name
                          ? format(response.updatedAt, "MMM d")
                          : "—"}
                      </td>
                      <td className="py-2.5">
                        {response.status === "PENDING" && (
                          <ResendButton
                            tripId={trip.id}
                            responseId={response.id}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
