"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TripStatus = "DRAFT" | "INVITING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const STATUS_ORDER: TripStatus[] = ["DRAFT", "INVITING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function atLeast(status: TripStatus, min: TripStatus) {
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(min);
}

const tabs: { label: string; href: string; visibleFrom: TripStatus; organizerOnly?: boolean }[] = [
  { label: "Overview",        href: "",                visibleFrom: "DRAFT"     },
  { label: "Invitations",     href: "/invitations",    visibleFrom: "INVITING",  organizerOnly: true },
  { label: "Attendees",       href: "/attendees",      visibleFrom: "CONFIRMED", organizerOnly: true },
  { label: "Expenses",        href: "/expenses",       visibleFrom: "CONFIRMED" },
  { label: "Transportation",  href: "/transportation", visibleFrom: "CONFIRMED" },
  { label: "Transfers",       href: "/transfers",      visibleFrom: "CONFIRMED", organizerOnly: true },
  { label: "Updates",         href: "/updates",        visibleFrom: "CONFIRMED" },
  { label: "Info",            href: "/info",           visibleFrom: "CONFIRMED" },
  { label: "Housing",         href: "/housing",        visibleFrom: "DRAFT",     organizerOnly: true },
];

export function TripSubNav({ slug, status, isOrganizer }: { slug: string; status: TripStatus; isOrganizer: boolean }) {
  const pathname = usePathname();
  const base = `/trips/${slug}`;

  const visibleTabs = tabs.filter((t) => atLeast(status, t.visibleFrom) && (!t.organizerOnly || isOrganizer));

  return (
    <nav className="flex gap-1 border-b mb-6">
      {visibleTabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive =
          tab.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
