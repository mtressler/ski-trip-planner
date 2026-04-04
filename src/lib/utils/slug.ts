import { prisma } from "@/lib/prisma";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) {
    return `trip-${Date.now().toString(36)}`;
  }

  const existing = await prisma.trip.findUnique({ where: { slug: base } });
  if (!existing) return base;

  // Append a short random suffix
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}-${suffix}`;
    const found = await prisma.trip.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
  }

  // Fallback: timestamp-based
  return `${base}-${Date.now().toString(36)}`;
}
