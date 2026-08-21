import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { listPatients } from "@/lib/server/actions";
import type { Patient } from "@/lib/types";
import { JourneyBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/patients")({ component: PatientsPage });

function PatientsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Patient[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      listPatients({ data: { query: q } }).then(setRows).catch(() => setRows([]));
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Charts</p>
          <h1 className="mt-1 font-display text-4xl text-ink">Patients</h1>
        </div>
        <Button asChild>
          <Link to="/app/onboard">Onboard someone</Link>
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          className="pl-9"
          placeholder="Name, phone, city, or chart #"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[72px_1.4fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wider text-subtle sm:grid">
          <span>#</span>
          <span>Name</span>
          <span>Contact</span>
          <span>City</span>
          <span>Journey</span>
        </div>
        <ul>
          {rows.map((p) => (
            <li key={p.id} className="border-b border-border last:border-0">
              <Link
                to="/app/patients/$id"
                params={{ id: p.id }}
                className="grid min-h-14 grid-cols-1 items-center gap-1 px-4 py-3 hover:bg-bg-warm sm:grid-cols-[72px_1.4fr_1fr_1fr_auto]"
              >
                <span className="font-mono text-xs tabular-nums text-subtle">{p.patient_no}</span>
                <span className="text-sm font-medium text-ink">
                  {p.last_name}, {p.first_name}
                </span>
                <span className="text-xs text-muted">{p.phone_cell || p.email || "—"}</span>
                <span className="text-xs text-muted">{p.city || "—"}</span>
                <JourneyBadge stage={p.journey_stage} />
              </Link>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="px-4 py-10 text-sm text-muted">No charts match.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
