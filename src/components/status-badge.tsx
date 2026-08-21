import { ORDER_STATUSES, JOURNEY_STAGES, type OrderStatus, type JourneyStage } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const meta = ORDER_STATUSES.find((s) => s.id === status);
  return <Badge tone={meta?.tone ?? "muted"}>{meta?.label ?? status}</Badge>;
}

export function JourneyBadge({ stage }: { stage: JourneyStage | string }) {
  const meta = JOURNEY_STAGES.find((s) => s.id === stage);
  const tone =
    stage === "paid" || stage === "delivered"
      ? "delivered"
      : stage === "at_lab"
        ? "lab"
        : stage === "ready_to_call"
          ? "ready"
          : stage === "notified"
            ? "notified"
            : stage === "canceled"
              ? "canceled"
              : "accent";
  return <Badge tone={tone}>{meta?.label ?? stage}</Badge>;
}
