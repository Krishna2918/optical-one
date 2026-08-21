import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEMO_PATIENT, DEMO_STAFF } from "@/lib/demo";
import { enterDemo, type DemoKind } from "@/lib/enter-demo";
import { cn } from "@/lib/utils";

export function useDemoEntry() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<DemoKind | null>(null);

  async function go(kind: DemoKind) {
    if (busy) return;
    setBusy(kind);
    try {
      const to = await enterDemo(kind);
      toast.success(kind === "staff" ? "Welcome to the floor" : "Welcome, Ciara");
      await navigate({ to });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open demo");
    } finally {
      setBusy(null);
    }
  }

  return { busy, go };
}

export function DemoLaunch({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const { busy, go } = useDemoEntry();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        size={size}
        disabled={!!busy}
        onClick={() => void go("staff")}
      >
        {busy === "staff" ? "Opening demo…" : "Enter demo"}
        <ArrowRight className="size-4" />
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={!!busy}
        onClick={() => void go("patient")}
      >
        {busy === "patient" ? "Opening…" : "Enter as patient"}
      </Button>
      <p className="font-mono text-xs text-subtle">
        {DEMO_STAFF.email} · {DEMO_STAFF.password}
        <span className="mx-2 text-border-strong">·</span>
        {DEMO_PATIENT.email} · {DEMO_PATIENT.password}
      </p>
    </div>
  );
}

export function HeaderDemoButton() {
  const { busy, go } = useDemoEntry();
  return (
    <Button
      type="button"
      size="sm"
      disabled={!!busy}
      onClick={() => void go("staff")}
    >
      {busy === "staff" ? "Opening…" : "Enter demo"}
    </Button>
  );
}
