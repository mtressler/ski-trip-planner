"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/server/actions/admin";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  _count: { organizedTrips: number; memberships: number };
};

interface AdminUsersTableProps {
  users: UserRow[];
  currentUserId: string;
}

export function AdminUsersTable({ users, currentUserId }: AdminUsersTableProps) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  function handleDelete(userId: string) {
    startTransition(async () => {
      await deleteUser(userId);
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm w-72"
      />

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Trips Organized</th>
              <th className="px-3 py-2">Memberships</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-xs">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <p className="font-medium">{user.name ?? "(no name)"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${user.role === "ADMIN" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{user._count.organizedTrips}</td>
                  <td className="px-3 py-2 text-center">{user._count.memberships}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {format(user.createdAt, "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2">
                    {user.id === currentUserId ? (
                      <span className="text-xs text-muted-foreground">You</span>
                    ) : deletingId === user.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-destructive">Delete?</span>
                        <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" disabled={isPending} onClick={() => handleDelete(user.id)}>
                          Yes
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setDeletingId(null)}>
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => setDeletingId(user.id)}
                        title="Delete user"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {users.length} users</p>
    </div>
  );
}
