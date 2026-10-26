"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  shopName,
  employeeName,
  role,
  isAdmin = false,
  clientNoun = "Client",
  clientNounPlural = "Clients",
  orgNoun = "Workspace",
  helperHint,
}: {
  children: React.ReactNode;
  shopName?: string;
  employeeName?: string;
  role?: string;
  isAdmin?: boolean;
  clientNoun?: string;
  clientNounPlural?: string;
  orgNoun?: string;
  helperHint?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/ai/status?warm=1").catch(() => undefined);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: isAdmin ? "CV Studio" : "My CVs", icon: LayoutDashboard },
    ...(isAdmin
      ? [
          { href: "/admin", label: "Admin desk", icon: Shield },
          { href: "/customers", label: clientNounPlural, icon: Users },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="no-print sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6 lg:gap-8">
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              className="flex min-w-0 items-center gap-2.5 text-[var(--ink)]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--signal)] text-[11px] font-extrabold tracking-[0.08em] text-white">
                CV
              </span>
              <span className="min-w-0">
                <span className="font-display block truncate text-base font-bold leading-none tracking-tight sm:text-[1.05rem]">
                  AI CV Maker
                </span>
                {shopName ? (
                  <span className="mt-1 hidden truncate text-[11px] font-medium text-[var(--muted)] sm:block">
                    {shopName}
                    {role ? ` · ${roleLabel(role)}` : ""} · {orgNoun}
                  </span>
                ) : null}
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {links.map((link) => {
                const Icon = link.icon;
                const active =
                  pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                      active
                        ? "bg-[var(--ink)] !text-white shadow-sm [&_svg]:!text-white"
                        : "!text-[var(--ink)]/80 hover:bg-[var(--mist)] hover:shadow-sm",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              >
                Website
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {employeeName ? (
              <span className="hidden max-w-[160px] truncate rounded-xl border border-[var(--border)] bg-[var(--mist)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] xl:inline">
                {employeeName}
                {isAdmin ? " · Admin" : " · User"}
              </span>
            ) : null}

            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/cvs/new">
                <FilePlus2 className="h-4 w-4" />
                New CV
              </Link>
            </Button>

            <Button type="button" variant="outline" size="sm" onClick={signOut} className="font-semibold">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {helperHint ? (
        <div className="no-print border-b border-[var(--border)] bg-[var(--mist)]/80">
          <p className="mx-auto max-w-7xl px-4 py-2 text-xs font-medium text-[var(--muted)] sm:px-6">
            {helperHint}
          </p>
        </div>
      ) : null}

      <main className="page-fade mx-auto max-w-7xl px-4 py-7 sm:px-6">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white shadow-[0_-4px_20px_rgba(11,20,38,0.06)] md:hidden">
        <div className={cn("grid", isAdmin ? "grid-cols-5" : "grid-cols-3")}>
          {[
            ...links,
            { href: "/cvs/new", label: "New CV", icon: FilePlus2 },
          ].map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            const isCta = link.href === "/cvs/new";
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  isCta && !active
                    ? "!text-[var(--signal-deep)]"
                    : active
                      ? "!text-[var(--ink)]"
                      : "!text-[var(--muted)]",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-xl",
                    active && "bg-[var(--ink)] !text-white [&_svg]:!text-white",
                    isCta && !active && "bg-[var(--signal)]/12 !text-[var(--signal-deep)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {link.label}
              </Link>
            );
          })}
          {!isAdmin ? (
            <button
              type="button"
              onClick={signOut}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-[var(--muted)]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl">
                <LogOut className="h-4 w-4" />
              </span>
              Sign out
            </button>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
