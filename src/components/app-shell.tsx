import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Route as RouteIcon,
  Settings2,
  ShoppingBag,
  Users,
  HeartPulse,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Floor", icon: LayoutDashboard, end: true },
  { to: "/app/calendar", label: "Book", icon: CalendarDays },
  { to: "/app/patients", label: "Patients", icon: Users },
  { to: "/app/journey", label: "Journey", icon: RouteIcon },
  { to: "/app/orders", label: "Orders", icon: ShoppingBag },
  { to: "/app/inbox", label: "Mail", icon: Inbox },
  { to: "/app/admin", label: "Admin", icon: Settings2, admin: true },
];

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = profile.role !== "patient";

  return (
    <div className="min-h-svh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <Link to="/app" className="px-2">
          <Logo />
        </Link>
        <p className="mt-6 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">
          Practice
        </p>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5">
          {nav
            .filter((i) => !i.admin || isAdmin)
            .map((item) => {
              const active = item.end
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150",
                    active ? "bg-accent-soft text-accent" : "text-muted hover:bg-bg-warm hover:text-fg",
                  )}
                >
                  <item.icon className="size-4" strokeWidth={1.7} />
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="space-y-2 px-1">
          <Link
            to="/care"
            className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted hover:bg-bg-warm"
          >
            <HeartPulse className="size-4" strokeWidth={1.7} />
            Patient portal
          </Link>
          <div className="flex items-center gap-2 rounded-xl bg-bg-warm px-2 py-2">
            <span className="grid size-8 place-items-center rounded-full bg-navy text-xs text-navy-fg">
              {initials(profile.display_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{profile.display_name}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-subtle">
                {profile.role}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => void signOut("/")}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/app/inbox" className="text-xs font-medium text-muted">
              Mail
            </Link>
            <Link to="/app/admin" className="text-xs font-medium text-muted">
              Admin
            </Link>
            <Link to="/care" className="text-xs font-medium text-accent">
              Portal
            </Link>
          </div>
        </header>
        <div className="px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 px-1 py-1 backdrop-blur lg:hidden">
          {nav.slice(0, 5).map((item) => {
            const active = item.end
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px]",
                  active ? "text-accent" : "text-subtle",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
