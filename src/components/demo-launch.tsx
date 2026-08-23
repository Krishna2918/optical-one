import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoKind } from "@/lib/demo";
import { enterDemo } from "@/lib/enter-demo";
import { cn } from "@/lib/utils";

export function useDemoEntry() {
  const [busy, setBusy] = useState<DemoKind | null>(null);

  function go(kind: DemoKind) {
    if (busy) return;
    setBusy(kind);
    void enterDemo(kind)
      .then((to) => {
        window.location.assign(to);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Could not open demo");
        setBusy(null);
      });
  }

  return { busy, go };
}

export function DemoLaunch({
  className,
  onPick,
  columns = 2,
}: {
  className?: string;
  onPick?: (email: string, password: string) => void;
  columns?: 1 | 2;
}) {
  const { busy, go } = useDemoEntry();

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Sample logins</p>
          <p className="mt-1 text-sm text-muted">Tap Open on any door. Same password on all four.</p>
        </div>
        <p className="rounded-full bg-bg-warm px-3 py-1 font-mono text-xs text-ink">{DEMO_PASSWORD}</p>
      </div>
      <ul className={cn("grid gap-3", columns > 1 && "sm:grid-cols-2")}>
        {DEMO_ACCOUNTS.map((account) => {
          const running = busy === account.kind;
          return (
            <li key={account.kind}>
              <div className="flex h-full items-center gap-3 rounded-2xl bg-card p-4 shadow-border">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                    {account.roleLabel}
                  </p>
                  <p className="truncate text-sm font-medium text-ink">{account.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted">{account.email}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  data-testid={`demo-open-${account.kind}`}
                  aria-label={`Open ${account.roleLabel} demo`}
                  disabled={!!busy}
                  onClick={() => {
                    onPick?.(account.email, account.password);
                    go(account.kind);
                  }}
                >
                  {running ? "Starting…" : "Open"}
                  {running ? null : <ArrowRight className="size-3.5" />}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {busy ? (
        <p className="text-xs text-muted">First open on a new link takes a few seconds.</p>
      ) : null}
    </div>
  );
}

export function HeaderDemoButton({
  size = "sm",
}: {
  size?: "sm" | "default" | "lg";
}) {
  const { busy, go } = useDemoEntry();
  return (
    <Button
      type="button"
      size={size}
      data-testid="header-enter-demo"
      disabled={!!busy}
      onClick={() => go("owner")}
    >
      {busy === "owner" ? "Starting…" : "Enter demo"}
      {busy === "owner" ? null : <ArrowRight className="size-4" />}
    </Button>
  );
}
