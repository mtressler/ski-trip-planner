"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "" },
  { label: "Invitations", href: "/invitations" },
];

export function TripSubNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/trips/${slug}`;

  return (
    <nav className="flex gap-1 border-b mb-6">
      {tabs.map((tab) => {
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
