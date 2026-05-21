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
import { seedRandomResponses } from "@/server/actions/dev-seed";

export function DevSeedPanel({ tripId }: { tripId: string }) {
  const [count, setCount] = useState(5);
  const [interestMode, setInterestMode] = useState<"all_interested" | "random">("all_interested");
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await seedRandomResponses(tripId, count, interestMode);
      setResult(res);
    });
  }

  return (
    <Card className="border-dashed border-yellow-400">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-700">Dev — Seed Random Responses</CardTitle>
        <CardDescription className="text-xs">
          Only visible in development. Generates fake interest responses for testing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Count</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-8 w-20 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Interest Level</label>
            <div className="flex gap-3">
              {([
                ["all_interested", "All Interested"],
                ["random", "Random"],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="interestMode"
                    value={val}
                    checked={interestMode === val}
                    onChange={() => setInterestMode(val)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" size="sm" disabled={isPending} className="bg-yellow-600 hover:bg-yellow-700">
            {isPending ? "Generating..." : "Generate"}
          </Button>

          {result?.success && (
            <span className="text-xs text-green-700">{result.success}</span>
          )}
          {result?.error && (
            <span className="text-xs text-destructive">{result.error}</span>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
