import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { AdminTripsTable } from "@/components/admin/admin-trips-table";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { Users, Map, TrendingUp } from "lucide-react";

export default async function AdminPage() {
  const session = await requireAuth();

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (currentUser?.role !== "ADMIN") notFound();

  const [users, trips, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { organizedTrips: true, memberships: true } },
      },
    }),
    prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        resort: true,
        startDate: true,
        visibility: true,
        organizers: { select: { user: { select: { name: true, email: true } } } },
        _count: { select: { members: true, interestResponses: true } },
      },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.trip.groupBy({ by: ["status"], _count: { id: true } }),
    ]),
  ]);

  const [totalUsers, totalTrips, tripsByStatus] = stats;

  const statusCounts = Object.fromEntries(
    tripsByStatus.map((s) => [s.status, s._count.id])
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Site Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System overview — restricted to ADMIN role.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Users" value={totalUsers} />
        <StatCard icon={<Map className="h-4 w-4" />} label="Total Trips" value={totalTrips} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Active Trips" value={(statusCounts["INVITING"] ?? 0) + (statusCounts["CONFIRMED"] ?? 0) + (statusCounts["IN_PROGRESS"] ?? 0)} />
        <StatCard icon={<Map className="h-4 w-4" />} label="Completed" value={statusCounts["COMPLETED"] ?? 0} />
      </div>

      {/* Trip status breakdown */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Trips by Status</h2>
        <div className="flex flex-wrap gap-2">
          {["DRAFT","INVITING","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED"].map((s) => (
            <div key={s} className="border rounded px-3 py-1.5 text-sm">
              <span className="font-medium">{statusCounts[s] ?? 0}</span>
              <span className="text-muted-foreground ml-1.5 text-xs">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trips table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">All Trips</h2>
        <AdminTripsTable trips={trips} />
      </div>

      {/* Users table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">All Users</h2>
        <AdminUsersTable users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
