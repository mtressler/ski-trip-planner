"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 mx-auto max-w-6xl">
        <Link href="/" className="flex items-center gap-2 font-semibold mr-6">
          <Mountain className="h-5 w-5" />
          <span>Ski Trip Planner</span>
        </Link>

        {status === "authenticated" && session?.user && (
          <nav className="flex items-center gap-4 text-sm mr-auto">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/past-trips"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Past Trips
            </Link>
            {session.user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {status === "loading" && (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          )}

          {status === "unauthenticated" && (
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Sign In
            </Link>
          )}

          {status === "authenticated" && session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="relative h-8 w-8 rounded-full cursor-pointer" />
                }
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session.user.image ?? undefined}
                    alt={session.user.name ?? "User"}
                  />
                  <AvatarFallback>
                    {getInitials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/profile" />}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
