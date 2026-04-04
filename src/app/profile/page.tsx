import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ProfilePage() {
  const session = await requireAuth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  async function updateProfile(formData: FormData) {
    "use server";
    const session = await requireAuth();
    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phone },
    });

    revalidatePath("/profile");
  }

  return (
    <div className="container max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
          <CardDescription>
            Update your name and contact details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                placeholder="Optional"
              />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
