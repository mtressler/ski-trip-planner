import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TripSubNav } from "@/components/trips/trip-sub-nav";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      status: true,
      organizers: { select: { userId: true } },
      members: {
        where: {
          status: "CONFIRMED",
          ...(session?.user?.id ? { userId: session.user.id } : { userId: "none" }),
        },
        select: { userId: true },
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer =
    session?.user?.id != null &&
    trip.organizers.some((o) => o.userId === session.user!.id);
  const isMember = trip.members.length > 0;
  const showNav = isOrganizer || isMember;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {showNav && (
        <TripSubNav
          slug={trip.slug}
          status={trip.status as "DRAFT" | "INVITING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"}
          isOrganizer={isOrganizer}
        />
      )}
      {children}
    </div>
  );
}
