"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resetInviteToken } from "@/server/actions/admin";
import { RotateCcw, ExternalLink } from "lucide-react";
import { format } from "date-fns";

type TripRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  resort: string;
  startDate: Date;
  visibility: string;
  _count: { members: number; interestResponses: number };
  organizers: { user: { name: string | null; email: string } }[];
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  INVITING: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface AdminTripsTableProps {
  trips: TripRow[];
}

export function AdminTripsTable({ trips }: AdminTripsTableProps) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statuses = ["ALL", "DRAFT", "INVITING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  const filtered = trips.filter((t) => {
    const matchStatus = filter === "ALL" || t.status === filter;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function handleReset(tripId: string) {
    startTransition(async () => {
      await resetInviteToken(tripId);
      setResettingId(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-60"
        />
        <div className="flex gap-1 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${filter === s ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Resort</th>
              <th className="px-3 py-2">Start Date</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Organizer</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground text-xs">
                  No trips found.
                </td>
              </tr>
            ) : (
              filtered.map((trip) => (
                <tr key={trip.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link href={`/trips/${trip.slug}`} className="font-medium hover:underline flex items-center gap-1" target="_blank">
                      {trip.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground">{trip.slug}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[trip.status] ?? ""}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{trip.resort}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {format(trip.startDate, "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2 text-center">{trip._count.members}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {trip.organizers[0]?.user.name ?? trip.organizers[0]?.user.email ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {resettingId === trip.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-destructive">Reset token?</span>
                        <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" disabled={isPending} onClick={() => handleReset(trip.id)}>
                          Yes
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setResettingId(null)}>
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => setResettingId(trip.id)}
                        title="Reset invite token"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset Token
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {trips.length} trips</p>
    </div>
  );
}
