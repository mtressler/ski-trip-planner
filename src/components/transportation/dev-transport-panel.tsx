"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { seedTransportationDetails } from "@/server/actions/dev-seed";

interface DevTransportPanelProps {
  tripId: string;
  memberCount: number;
}

export function DevTransportPanel({ tripId, memberCount }: DevTransportPanelProps) {
  const defaultFlyers = Math.round(memberCount * 0.4);
  const defaultDrivers = Math.round(memberCount * 0.3);

  const [flyers, setFlyers] = useState(defaultFlyers);
  const [rentingCar, setRentingCar] = useState(0);
  const [drivers, setDrivers] = useState(defaultDrivers);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const passengers = Math.max(0, memberCount - flyers - drivers);
  const isOver = flyers + drivers > memberCount;

  function handleFlyers(val: number) {
    const clamped = Math.max(0, Math.min(val, memberCount));
    setFlyers(clamped);
    if (rentingCar > clamped) setRentingCar(clamped);
    if (clamped + drivers > memberCount) setDrivers(memberCount - clamped);
  }

  function handleRentingCar(val: number) {
    setRentingCar(Math.max(0, Math.min(val, flyers)));
  }

  function handleDrivers(val: number) {
    setDrivers(Math.max(0, Math.min(val, memberCount - flyers)));
  }

  function handleRandomize() {
    setResult(null);
    startTransition(async () => {
      const res = await seedTransportationDetails(tripId, flyers, drivers, rentingCar);
      setResult(res);
    });
  }

  return (
    <Card className="border-dashed border-yellow-400">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-700">Dev — Randomize Transportation</CardTitle>
        <CardDescription className="text-xs">
          Only visible in development. Overwrites transportation details for all {memberCount} confirmed members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          {/* Flyers + renting car sub-group */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Flyers</label>
            <Input
              type="number"
              min={0}
              max={memberCount}
              value={flyers}
              onChange={(e) => handleFlyers(Number(e.target.value))}
              className="h-8 w-20 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              └ Able to rent a car
            </label>
            <Input
              type="number"
              min={0}
              max={flyers}
              value={rentingCar}
              onChange={(e) => handleRentingCar(Number(e.target.value))}
              className="h-8 w-20 text-sm"
              disabled={flyers === 0}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Drivers</label>
            <Input
              type="number"
              min={0}
              max={memberCount - flyers}
              value={drivers}
              onChange={(e) => handleDrivers(Number(e.target.value))}
              className="h-8 w-20 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Passengers</label>
            <div className="h-8 flex items-center px-3 rounded-lg border border-input bg-muted/40 text-sm w-20">
              {isOver ? <span className="text-destructive">—</span> : passengers}
            </div>
          </div>

          <Button
            size="sm"
            disabled={isPending || isOver}
            onClick={handleRandomize}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isPending ? "Randomizing..." : "Randomize"}
          </Button>

          <div className="text-xs">
            {isOver && (
              <span className="text-destructive">Flyers + drivers exceeds {memberCount} members</span>
            )}
            {result?.success && <span className="text-green-700">{result.success}</span>}
            {result?.error && <span className="text-destructive">{result.error}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
