"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getAttendeesCSV } from "@/server/actions/members";
import { Download } from "lucide-react";

export function CsvExportButton({ tripId, tripSlug }: { tripId: string; tripSlug: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const csv = await getAttendeesCSV(tripId);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tripSlug}-attendees.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      <Download className="h-4 w-4 mr-1.5" />
      {isPending ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
