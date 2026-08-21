import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clockLabel, minutesFromIso, datePart } from "@/lib/slots";
import { getDashboard } from "@/lib/server/workspace";
import { JOURNEY_STAGES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JourneyBadge } from "@/components/status-badge";

export const Route = createFileRoute("/app/")({ component: Floor });

function Floor() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setData(null));
  }, []);

  if (!data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-bg-warm" />;
  }

  const tiles = [
    { label: "Patients", value: data.stats.patients },
    { label: "On the book today", value: data.stats.appointmentsToday },
    { label: "Open orders", value: data.stats.openOrders },
    { label: "Ready to call", value: data.stats.readyToCall },
    { label: "Still onboarding", value: data.stats.onboarding },
    { label: "Mail today", value: data.stats.emailsToday },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
            Optical One
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink">The floor</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/onboard">New patient</Link>
          </Button>
          <Button asChild>
            <Link to="/app/calendar">Open the book</Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-2 font-display text-3xl tabular-nums text-ink">{t.value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-ink">Coming up</h2>
            <Link to="/app/calendar" className="text-xs text-accent">
              Full book
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {data.upcoming.length === 0 ? (
              <li className="py-8 text-sm text-muted">Nothing on the horizon.</li>
            ) : (
              data.upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{a.patient_name}</p>
                    <p className="text-xs text-muted">
                      {a.doctor_name} · {a.service}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-subtle">
                    {datePart(a.start_at).slice(5)} · {clockLabel(minutesFromIso(a.start_at))}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-2xl text-ink">Journey mix</h2>
          <ul className="space-y-2">
            {JOURNEY_STAGES.map((s) => {
              const n = data.pipeline.find((p) => p.stage === s.id)?.n ?? 0;
              if (!n) return null;
              return (
                <li key={s.id} className="flex items-center justify-between">
                  <JourneyBadge stage={s.id} />
                  <span className="text-sm tabular-nums text-muted">{n}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">
              Latest mail
            </h3>
            <ul className="space-y-2">
              {data.recentMail.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="truncate text-ink">{m.subject}</p>
                  <p className="text-xs text-muted">{m.to_name || m.to_email}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}
