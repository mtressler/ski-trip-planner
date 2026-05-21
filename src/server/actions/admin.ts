"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { randomBytes } from "crypto";

async function requireAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
  return session;
}

export async function resetInviteToken(tripId: string) {
  await requireAdmin();
  const newToken = randomBytes(20).toString("hex");
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { inviteToken: newToken },
    select: { slug: true },
  });
  revalidatePath("/admin");
  revalidatePath(`/trips/${trip.slug}`);
  return { success: true };
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return { success: true };
}
