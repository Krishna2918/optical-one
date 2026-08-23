import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWorkspace } from "@/lib/server/workspace";
import type { Workspace } from "@/lib/server/workspace";
import { AppShell } from "@/components/app-shell";
import { demoUserFromKind } from "@/lib/demo-session";
import { peekDemoKind } from "@/lib/server/demo";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/app")({
  loader: async () => ({ demoKind: await peekDemoKind() }),
  component: AppLayout,
});

function OpeningScreen({ message }: { message?: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-bg px-6">
      <div className="text-center">
        <Logo />
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-accent">
          Optical One
        </p>
        <p className="mt-3 font-display text-3xl text-ink">Opening the floor</p>
        <p className="mt-2 text-sm text-muted">
          {message ?? "Reed’s book is coming up."}
        </p>
      </div>
    </div>
  );
}

function AppLayout() {
  const { demoKind } = Route.useLoaderData();
  const session = useCurrentUserState();
  const user = session.user ?? (demoKind ? demoUserFromKind(demoKind) : null);
  const isPending = user ? false : session.isPending;
  const [ws, setWs] = useState<Workspace | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    let attempt = 0;

    function load() {
      getWorkspace()
        .then((w) => {
          if (live) setWs(w);
        })
        .catch((e: unknown) => {
          if (!live) return;
          attempt += 1;
          if (attempt < 2) {
            window.setTimeout(load, 600);
            return;
          }
          setErr(e instanceof Error ? e.message : "Could not open practice");
        });
    }

    load();
    return () => {
      live = false;
    };
  }, [user]);

  if (isPending) return <OpeningScreen />;
  if (!user) return <RedirectToSignIn />;
  if (err) {
    return (
      <div className="grid min-h-svh place-items-center px-6 text-center">
        <p className="text-sm text-muted">{err}</p>
      </div>
    );
  }
  if (!ws) return <OpeningScreen />;

  if (ws.profile.role === "patient") {
    return <Navigate to="/care" />;
  }

  return (
    <AppShell profile={ws.profile}>
      <Outlet />
    </AppShell>
  );
}
