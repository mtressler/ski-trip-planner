"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type HouseFormState = { error?: Record<string, string[] | undefined>; success?: boolean } | undefined;

interface HouseFormProps {
  action: (prevState: HouseFormState, formData: FormData) => Promise<HouseFormState>;
  initialValues?: {
    listingUrl?: string;
    price?: string;
    bedSpots?: string;
    floorSpots?: string;
    pricePerBedSpot?: string;
    pricePerFloorSpot?: string;
  };
  onSuccess: () => void;
  submitLabel?: string;
}

export function HouseForm({ action, initialValues, onSuccess, submitLabel = "Save" }: HouseFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (prev: HouseFormState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result?.success) onSuccess();
      return result;
    },
    undefined
  );

  const err = state?.error;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="listingUrl">Listing URL</Label>
        <Input
          id="listingUrl"
          name="listingUrl"
          type="url"
          placeholder="https://airbnb.com/rooms/..."
          defaultValue={initialValues?.listingUrl}
        />
        {err?.listingUrl && <p className="text-xs text-destructive">{err.listingUrl[0]}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="price">Total Price ($)</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" placeholder="0.00" defaultValue={initialValues?.price} />
          {err?.price && <p className="text-xs text-destructive">{err.price[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="bedSpots">Bed Spots</Label>
          <Input id="bedSpots" name="bedSpots" type="number" min="0" placeholder="0" defaultValue={initialValues?.bedSpots} />
          {err?.bedSpots && <p className="text-xs text-destructive">{err.bedSpots[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="floorSpots">Floor Spots</Label>
          <Input id="floorSpots" name="floorSpots" type="number" min="0" placeholder="0" defaultValue={initialValues?.floorSpots} />
          {err?.floorSpots && <p className="text-xs text-destructive">{err.floorSpots[0]}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="pricePerBedSpot">Price / Bed Spot ($)</Label>
          <Input id="pricePerBedSpot" name="pricePerBedSpot" type="number" step="0.01" min="0" placeholder="Optional" defaultValue={initialValues?.pricePerBedSpot} />
          {err?.pricePerBedSpot && <p className="text-xs text-destructive">{err.pricePerBedSpot[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="pricePerFloorSpot">Price / Floor Spot ($)</Label>
          <Input id="pricePerFloorSpot" name="pricePerFloorSpot" type="number" step="0.01" min="0" placeholder="Optional" defaultValue={initialValues?.pricePerFloorSpot} />
          {err?.pricePerFloorSpot && <p className="text-xs text-destructive">{err.pricePerFloorSpot[0]}</p>}
        </div>
      </div>

      {err?._form && <p className="text-sm text-destructive">{err._form[0]}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
