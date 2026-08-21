import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { journeyBoard, setJourney } from "@/lib/server/actions";
import { JOURNEY_STAGES } from "@/lib/constants";
import type { Patient } from "@/lib/types";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/app/journey")({ component: JourneyPage });

function JourneyPage() {
  const [rows, setRows] = useState<Patient[]>([]);

  useEffect(() => {
    journeyBoard().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
          Client journey
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink">Tracking</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Drag-free board. Move a card to advance the chart — lab statuses stay in lockstep with orders.
        </p>
      </header>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {JOURNEY_STAGES.map((s) => {
          const col = rows.filter((p) => p.journey_stage === s.id);
          return (
            <Card key={s.id} className="min-w-56 flex-1 p-3">
              <p className="px-1 text-xs font-medium uppercase tracking-wider text-subtle">
                {s.label}
                <span className="ml-2 tabular-nums">{col.length}</span>
              </p>
              <ul className="mt-2 space-y-2">
                {col.map((p) => (
                  <li key={p.id} className="rounded-xl bg-bg-warm p-2.5">
                    <Link
                      to="/app/patients/$id"
                      params={{ id: p.id }}
                      className="text-sm font-medium text-ink"
                    >
                      {p.last_name}, {p.first_name}
                    </Link>
                    <p className="text-[11px] text-subtle">#{p.patient_no}</p>
                    <select
                      className="mt-2 h-8 w-full rounded-md bg-card px-1 text-[11px] shadow-border"
                      value={p.journey_stage}
                      onChange={(e) =>
                        void setJourney({ data: { patientId: p.id, stage: e.target.value } }).then(
                          () => journeyBoard().then(setRows),
                        )
                      }
                    >
                      {JOURNEY_STAGES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
