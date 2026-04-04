import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return session as typeof session & {
    user: { id: string; name: string | null; email: string; image: string | null };
  };
}
