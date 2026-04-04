import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default async function SubmittedPage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = await params;

  const trip = await prisma.trip.findUnique({
    where: { inviteToken },
    select: { name: true },
  });

  if (!trip) notFound();

  return (
    <div className="container max-w-lg mx-auto px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Thanks!</CardTitle>
          <CardDescription className="text-base">
            Your response for <strong>{trip.name}</strong> has been recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            We&apos;ve sent you a confirmation email with a link to update your
            response if you change your mind.
          </p>
          <p>The trip organizer will be in touch with next steps.</p>
        </CardContent>
      </Card>
    </div>
  );
}
