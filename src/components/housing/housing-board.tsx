"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HouseForm } from "./house-form";
import { addHouse, updateHouse, deleteHouse, selectHouse, generateHouseExpense } from "@/server/actions/housing";
import { ExternalLink, Pencil, Trash2, CheckCircle, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type HouseData = {
  id: string;
  listingUrl: string;
  price: number;
  bedSpots: number;
  floorSpots: number;
  pricePerBedSpot: number | null;
  pricePerFloorSpot: number | null;
};

export type MemberSplit = {
  name: string;
  sleepingPreference: "BED" | "FLOOR";
  spotPrice: number;
  deposit: number;
  net: number;
};

interface HousingBoardProps {
  tripId: string;
  slug: string;
  houses: HouseData[];
  selectedHouseId: string | null;
  memberSplits: MemberSplit[];
  hasExistingHouseExpense: boolean;
}

export function HousingBoard({
  tripId,
  slug,
  houses,
  selectedHouseId,
  memberSplits,
  hasExistingHouseExpense,
}: HousingBoardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHouse, setEditingHouse] = useState<HouseData | null>(null);
  const [deletingHouseId, setDeletingHouseId] = useState<string | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const selectedHouse = houses.find((h) => h.id === selectedHouseId) ?? null;
  const canGenerate =
    selectedHouse != null &&
    (selectedHouse.pricePerBedSpot != null || selectedHouse.pricePerFloorSpot != null);

  function handleSelect(houseId: string) {
    startTransition(async () => {
      await selectHouse(houseId === selectedHouseId ? null : houseId, tripId);
    });
  }

  function handleDelete(houseId: string) {
    startTransition(async () => {
      await deleteHouse(houseId);
      setDeletingHouseId(null);
    });
  }

  function handleGenerate() {
    if (hasExistingHouseExpense && !showGenerateConfirm) {
      setShowGenerateConfirm(true);
      return;
    }
    setGenerateError(null);
    startTransition(async () => {
      const result = await generateHouseExpense(tripId);
      if (result.error) {
        setGenerateError(result.error);
      } else {
        setGenerateSuccess(true);
        setShowGenerateConfirm(false);
      }
    });
  }

  function listingDomain(url: string) {
    try { return new URL(url).hostname.replace("www.", ""); }
    catch { return url.slice(0, 40); }
  }

  return (
    <div className="space-y-6">
      {/* Add house button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add House
        </Button>
      </div>

      {/* House grid */}
      {houses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No houses added yet. Click &quot;Add House&quot; to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {houses.map((house) => {
            const isSelected = house.id === selectedHouseId;
            const isDeleting = deletingHouseId === house.id;
            return (
              <Card
                key={house.id}
                className={cn(
                  "transition-colors",
                  isSelected && "border-primary ring-1 ring-primary"
                )}
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <a
                      href={house.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      {listingDomain(house.listingUrl)}
                    </a>
                    {isSelected && (
                      <Badge className="w-fit bg-green-100 text-green-700 border-green-200">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingHouse(house)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-destructive">Delete?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDelete(house.id)}
                          disabled={isPending}
                        >
                          Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => setDeletingHouseId(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => setDeletingHouseId(house.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Total</p>
                      <p className="font-medium">${Number(house.price).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Bed spots</p>
                      <p className="font-medium">
                        {house.bedSpots}
                        {house.pricePerBedSpot != null && (
                          <span className="text-muted-foreground text-xs"> · ${Number(house.pricePerBedSpot).toFixed(0)}/ea</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Floor spots</p>
                      <p className="font-medium">
                        {house.floorSpots}
                        {house.pricePerFloorSpot != null && (
                          <span className="text-muted-foreground text-xs"> · ${Number(house.pricePerFloorSpot).toFixed(0)}/ea</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleSelect(house.id)}
                    disabled={isPending}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Deselect
                      </>
                    ) : (
                      "Select this house"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate house expense */}
      {selectedHouse && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">House Expense</h3>
              <p className="text-xs text-muted-foreground">
                {canGenerate
                  ? `Generate individual splits for all ${memberSplits.length} confirmed members.`
                  : "Set per-spot prices on the selected house to enable expense generation."}
              </p>
            </div>
            {canGenerate && (
              <Button
                size="sm"
                variant={hasExistingHouseExpense ? "outline" : "default"}
                onClick={handleGenerate}
                disabled={isPending || generateSuccess}
              >
                {generateSuccess ? (
                  "Generated!"
                ) : hasExistingHouseExpense ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate Expense
                  </>
                ) : (
                  "Generate House Expense"
                )}
              </Button>
            )}
          </div>

          {/* Confirm regenerate warning */}
          {showGenerateConfirm && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm space-y-2">
              <p className="text-destructive font-medium">Replace existing house expense?</p>
              <p className="text-muted-foreground text-xs">
                The previous house expense and all its splits will be deleted and recreated.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleGenerate} disabled={isPending}>
                  Yes, regenerate
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowGenerateConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {generateError && <p className="text-sm text-destructive">{generateError}</p>}

          {/* Per-member preview */}
          {canGenerate && memberSplits.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
              <div className="divide-y rounded-md border text-sm">
                {memberSplits.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5">
                    <span>{m.name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{m.sleepingPreference === "BED" ? "Bed" : "Floor"}</span>
                      <span>${m.spotPrice.toFixed(0)} − ${m.deposit.toFixed(0)} deposit</span>
                      <span className="font-medium text-foreground">${m.net.toFixed(2)} owed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add house dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add House</DialogTitle>
          </DialogHeader>
          <HouseForm
            action={addHouse.bind(null, tripId)}
            onSuccess={() => setShowAddDialog(false)}
            submitLabel="Add House"
          />
        </DialogContent>
      </Dialog>

      {/* Edit house dialog */}
      <Dialog open={editingHouse != null} onOpenChange={(open) => { if (!open) setEditingHouse(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit House</DialogTitle>
          </DialogHeader>
          {editingHouse && (
            <HouseForm
              action={updateHouse.bind(null, editingHouse.id, slug)}
              initialValues={{
                listingUrl: editingHouse.listingUrl,
                price: String(editingHouse.price),
                bedSpots: String(editingHouse.bedSpots),
                floorSpots: String(editingHouse.floorSpots),
                pricePerBedSpot: editingHouse.pricePerBedSpot != null ? String(editingHouse.pricePerBedSpot) : "",
                pricePerFloorSpot: editingHouse.pricePerFloorSpot != null ? String(editingHouse.pricePerFloorSpot) : "",
              }}
              onSuccess={() => setEditingHouse(null)}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
