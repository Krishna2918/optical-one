import { createFileRoute, Link } from "@tanstack/react-router";
import { clockLabel, minutesFromIso, datePart } from "@/lib/slots";
import { useEffect, useState } from "react";
import { myCare } from "@/lib/server/actions";
import { JourneyBadge, OrderStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/care/")({ component: CareHome });

function CareHome() {
  const [data, setData] = useState<Awaited<ReturnType<typeof myCare>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    let attempt = 0;
    setError(null);

    function load() {
      myCare()
        .then((d) => {
          if (live) setData(d);
        })
        .catch((e: unknown) => {
          if (!live) return;
          attempt += 1;
          if (attempt < 2) {
            window.setTimeout(load, 700);
            return;
          }
          setError(e instanceof Error ? e.message : "Could not open the portal");
        });
    }

    load();
    return () => {
      live = false;
    };
  }, [tick]);

  if (error && !data) {
    return (
      <div className="space-y-3 py-8">
        <p className="text-sm text-muted">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setTick((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return <div className="h-48 animate-pulse rounded-2xl bg-bg-warm" />;

  const preview =
    data.workspace.profile.role !== "patient" && data.patient
      ? `Staff preview · viewing ${data.patient.first_name} ${data.patient.last_name}`
      : null;

  if (!data.patient) {
    return (
      <Card className="space-y-3">
        <h1 className="font-display text-3xl text-ink">No chart yet</h1>
        <p className="text-sm text-muted">
          Finish onboarding to open your patient chart, or ask the front desk to invite this email.
        </p>
        <Button asChild>
          <Link to="/care/onboard">Start onboarding</Link>
        </Button>
      </Card>
    );
  }

  const p = data.patient;

  return (
    <div className="space-y-6">
      {preview ? (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">{preview}</p>
      ) : null}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-accent">{data.workspace.clinic.name}</p>
          <h1 className="mt-1 font-display text-4xl text-ink">Hi, {p.first_name}</h1>
        </div>
        <JourneyBadge stage={p.journey_stage} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild>
          <Link to="/care/book">Book a visit</Link>
        </Button>
        {!p.onboarded ? (
          <Button variant="outline" asChild>
            <Link to="/care/onboard">Finish onboarding</Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to="/care/onboard">Update details</Link>
          </Button>
        )}
      </div>

      <Card>
        <h2 className="font-display text-2xl text-ink">Visits</h2>
        <ul className="mt-3 divide-y divide-border">
          {data.appointments.length === 0 ? (
            <li className="py-4 text-sm text-muted">Nothing on the book.</li>
          ) : (
            data.appointments.map((a) => (
              <li key={a.id} className="flex justify-between py-3 text-sm">
                <span>
                  {datePart(a.start_at)} · {clockLabel(minutesFromIso(a.start_at))}
                  <span className="block text-xs text-muted">{a.doctor_name}</span>
                </span>
                <span className="text-muted">{a.service}</span>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="font-display text-2xl text-ink">Orders</h2>
        <ul className="mt-3 space-y-3">
          {data.orders.length === 0 ? (
            <li className="text-sm text-muted">No lab work yet.</li>
          ) : (
            data.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between">
                <span className="text-sm">
                  {o.type}
                  {o.frame_name ? ` · ${o.frame_name}` : ""}
                </span>
                <OrderStatusBadge status={o.status} />
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="font-display text-2xl text-ink">Family</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.family.length === 0 ? (
            <li className="text-muted">No household linked.</li>
          ) : (
            data.family.map((f) => (
              <li key={f.id} className="flex justify-between">
                <span>{f.related_name}</span>
                <span className="text-muted">{f.relationship}</span>
              </li>
            ))
          )}
        </ul>
      </Card>

      {data.rx[0] ? (
        <Card>
          <h2 className="font-display text-2xl text-ink">Latest Rx</h2>
          <p className="mt-1 text-xs text-subtle">
            {data.rx[0].exam_date} · {data.rx[0].doctor_name}
          </p>
          <p className="mt-3 text-sm tabular-nums text-fg">
            OD {data.rx[0].od_sphere} {data.rx[0].od_cyl} × {data.rx[0].od_axis}{" "}
            {data.rx[0].od_add ? `add ${data.rx[0].od_add}` : ""}
          </p>
          <p className="text-sm tabular-nums text-fg">
            OS {data.rx[0].os_sphere} {data.rx[0].os_cyl} × {data.rx[0].os_axis}{" "}
            {data.rx[0].os_add ? `add ${data.rx[0].os_add}` : ""}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
