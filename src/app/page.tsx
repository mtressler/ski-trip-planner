import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { Mountain, Users, MapPin, CalendarDays } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <div className="max-w-2xl text-center py-24 space-y-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Mountain className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ski Trip Planner
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Organize group ski trips end-to-end. No more text chains,
            spreadsheets, or email threads.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-lg mx-auto">
          <div className="flex flex-col items-center text-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Invite your crew and collect responses
            </p>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <MapPin className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Manage lodging, transport, and logistics
            </p>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Track expenses and keep everyone in the loop
            </p>
          </div>
        </div>

        <LinkButton href="/sign-in" size="lg">
          Get Started
        </LinkButton>
      </div>
    </div>
  );
}
