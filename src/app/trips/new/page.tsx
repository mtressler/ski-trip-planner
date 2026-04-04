import { requireAuth } from "@/lib/auth-guard";
import { createTrip } from "@/server/actions/trip";
import { TripForm } from "@/components/trips/trip-form";

export default async function NewTripPage() {
  await requireAuth();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create a New Trip</h1>
      <TripForm action={createTrip} submitLabel="Create Trip" />
    </div>
  );
}
