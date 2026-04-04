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
      organizers: { select: { userId: true } },
    },
  });

  if (!trip) notFound();

  const isOrganizer =
    session?.user?.id &&
    trip.organizers.some((o) => o.userId === session.user!.id);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {isOrganizer && <TripSubNav slug={trip.slug} />}
      {children}
    </div>
  );
}
