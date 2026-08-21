import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWorkspace } from "@/lib/server/workspace";
import type { Workspace } from "@/lib/server/workspace";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    getWorkspace()
      .then((w) => {
        if (live) setWs(w);
      })
      .catch((e: unknown) => {
        if (live) setErr(e instanceof Error ? e.message : "Could not open practice");
      });
    return () => {
      live = false;
    };
  }, [user]);

  if (isPending) {
    return <div className="min-h-svh bg-bg" />;
  }
  if (!user) return <RedirectToSignIn />;
  if (err) {
    return (
      <div className="grid min-h-svh place-items-center px-6 text-center">
        <p className="text-sm text-muted">{err}</p>
      </div>
    );
  }
  if (!ws) {
    return (
      <div className="min-h-svh bg-bg px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-bg-warm" />
          <div className="h-40 animate-pulse rounded-2xl bg-bg-warm" />
        </div>
      </div>
    );
  }

  if (ws.profile.role === "patient") {
    return <Navigate to="/care" />;
  }

  return (
    <AppShell profile={ws.profile}>
      <Outlet />
    </AppShell>
  );
}
