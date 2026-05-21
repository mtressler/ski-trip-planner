import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-guard";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { CreateUpdateForm } from "@/components/updates/create-update-form";
import { PinButton, DeleteUpdateButton } from "@/components/updates/update-actions";

export default async function UpdatesPage({
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
      members: {
        where: { status: "CONFIRMED" },
        select: { userId: true },
      },
      updates: {
        include: {
          author: { select: { name: true, email: true } },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  const isMember = trip.members.some((m) => m.userId === session.user.id);
  if (!isOrganizer && !isMember) notFound();

  const memberCount = trip.members.length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Updates</h2>

      {isOrganizer && (
        <CreateUpdateForm tripId={trip.id} memberCount={memberCount} />
      )}

      {trip.updates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No updates yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trip.updates.map((update) => (
            <Card key={update.id} className={update.pinned ? "border-primary/30 bg-primary/5" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {update.pinned && (
                      <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <CardTitle className="text-sm font-semibold truncate">
                      {update.title}
                    </CardTitle>
                    {update.sentEmail && (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 shrink-0">
                        Emailed
                      </Badge>
                    )}
                  </div>
                  {isOrganizer && (
                    <div className="flex items-center gap-1 shrink-0">
                      <PinButton tripId={trip.id} updateId={update.id} pinned={update.pinned} />
                      <DeleteUpdateButton tripId={trip.id} updateId={update.id} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {update.author.name ?? update.author.email}
                  {" · "}
                  {format(update.createdAt, "MMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{update.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
