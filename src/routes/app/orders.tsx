import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listOrders, saveOrder } from "@/lib/server/actions";
import { ORDER_STATUSES } from "@/lib/constants";
import type { Order } from "@/lib/types";
import { OrderStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/app/orders")({ component: OrdersPage });

function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");

  async function reload() {
    setRows(await listOrders());
  }

  useEffect(() => {
    reload().catch(() => setRows([]));
  }, []);

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Lab & floor</p>
        <h1 className="mt-1 font-display text-4xl text-ink">Orders</h1>
      </header>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`h-9 rounded-full px-3 text-xs ${filter === "all" ? "bg-navy text-navy-fg" : "bg-bg-warm text-muted"}`}
        >
          All
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFilter(s.id)}
            className={`h-9 rounded-full px-3 text-xs ${filter === s.id ? "bg-navy text-navy-fg" : "bg-bg-warm text-muted"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {shown.map((o) => (
          <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link
                to="/app/patients/$id"
                params={{ id: o.patient_id }}
                className="text-sm font-medium text-ink"
              >
                {o.patient_name}
              </Link>
              <p className="text-xs text-muted">
                {o.type}
                {o.frame_name ? ` · ${o.frame_name}` : ""}
                {o.lens_type ? ` · ${o.lens_type}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-ink">{formatMoney(o.patient_total)}</span>
              <OrderStatusBadge status={o.status} />
              <select
                className="h-10 rounded-lg bg-card px-2 text-xs shadow-border"
                value={o.status}
                onChange={(e) =>
                  void saveOrder({
                    data: {
                      id: o.id,
                      patientId: o.patient_id,
                      status: e.target.value,
                      type: o.type,
                      frame_name: o.frame_name,
                      lens_type: o.lens_type,
                      patient_total: o.patient_total,
                      insurance_total: o.insurance_total,
                    },
                  })
                    .then(() => toast.success("Patient mailed if on file"))
                    .then(reload)
                }
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        ))}
        {shown.length === 0 ? <p className="text-sm text-muted">Nothing in this tray.</p> : null}
      </div>
    </div>
  );
}
